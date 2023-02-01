/**
 * 获取图片数据
 * @param {HTMLImageElement} image
 * @returns 属性data {Array} [r,g,b,opacity,r,g,b,opacity...]
 */
const getImageData = (image) => {
  const canvas = document.createElement("canvas");
  const c = canvas.getContext("2d");
  canvas.width = image.width;
  canvas.height = image.height;
  c.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imgData = c.getImageData(0, 0, canvas.width, canvas.height);
  return imgData;
};

/**
 * 图片下载器
 * @param {*} src
 * @returns {Promise<image>}
 */
const imageloader = (src) => {
  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    // 跨域
    image.crossOrigin = null;
    image.src = src;

    image.onload = () => resolve(image);
    image.onerror = reject;
  });
  return promise;
};

/**
 * 获取 rgb 数组
 * @param {Array} imageData.data 像素矩阵  [r,g,b,opacity,r,g,b,opacity...]
 * @returns {Array} rgb 数组 [r,g,b,r,g,b...]
 */
const getRgbArray = (pixelsArray) => {
  const rgbArray = [];
  if (
    Object.prototype.toString.call(pixelsArray) !== "[object Uint8ClampedArray]"
  )
    return rgbArray;
  for (let i = 0; i < pixelsArray.length; i += 4) {
    rgbArray.push(pixelsArray[i]); //r
    rgbArray.push(pixelsArray[i + 1]); //g
    rgbArray.push(pixelsArray[i + 2]); //b
  }
  return rgbArray;
};

/**
 *  二值化 图片数据
 * @param {ImageData} imageData 图片数据
 * @param {Number} threshold  阈值 (0-255)
 * @param  {Function} fn1 黑色循环回调
 * @param  {Function}  fn2 黑色循环回调
 * @returns  imageData
 */
const getBinaryImageData = (imgData, threshold, fn1, fn2) => {
  for (let i = 0; i < imgData.data.length; i += 4) {
    const R = imgData.data[i]; //R(0-255)
    const G = imgData.data[i + 1]; //G(0-255)
    const B = imgData.data[i + 2]; //B(0-255)
    const Alpha = imgData.data[i + 3]; //Alpha(0-255)
    const sum = (R + G + B) / 3;

    if (sum > threshold) {
      // 大于阈值变成白色
      imgData.data[i] = 255;
      imgData.data[i + 1] = 255;
      imgData.data[i + 2] = 255;
      imgData.data[i + 3] = Alpha;
      if (isFunction(fn1)) {
        fn1(i);
      }
    } else {
      // 小于阈值变成黑色
      imgData.data[i] = 0;
      imgData.data[i + 1] = 0;
      imgData.data[i + 2] = 0;
      imgData.data[i + 3] = Alpha;
      if (isFunction(fn2)) {
        fn2(i);
      }
    }
  }
  return imgData;
};

const isFunction = (fn) => {
  return Object.prototype.toString.call(fn) === "[object Function]";
};

/**
 * 找竖线二维矩阵
 * @param {Array} array { x,y }
 * @returns
 */
const findVerticalLineMatrix = (array) => {
  // 同一个x轴连续的y集合的map
  // 比如 1: [n:399,y:399,s:1}] 如果坐标高度是399的话，相当于 x坐标为1的y是一个连续黑线
  // 2: [{n:10,y:1,s:1},{n:20,y:42,s:22}] 相当于x坐标为2的有两条黑线, 开始位置s 以及长度n
  const tmp = {};
  /**
* {
n:连续次数
y:当前层级,
s:开始层级
}*/
  array.forEach((p) => {
    const x = p.x;
    // 存在
    if (tmp[x] && tmp[x].length) {
      const max = tmp[x].length - 1;
      if (tmp[x][max].y == p.y - 1) {
        //连续不改变开始层级
        tmp[x][max].n = tmp[x][max].n + 1;
        tmp[x][max].y = p.y;
      } else {
        // 非连续，改变开始层级,连续层级为1
        tmp[x].push({
          n: 1,
          s: p.y,
          y: p.y,
        });
      }
    } else {
      tmp[x] = [
        {
          n: 1,
          y: p.y,
          s: p.y,
        },
      ];
    }
  });
  return tmp;
};

/*
 * find block trait position 寻找黑色块儿特征的 x 坐标
 * @param array {
 *  x:{number}
 *  y:{number?
 * } 像素为0的数组
 * @return x {number}
 */
const findBlock = (
  array,
  trait = {
    fullLineLength: 87,
    notchLineLength: {
      a: 29,
      b: 27,
    },
    blockWidth: {
      max: 87,
      min: 83,
    },
  }
) => {
  const verticalLineMap = findVerticalLineMatrix(array);
  // 符合完整线特征数组
  const fullLineArray = [];
  // 符合凹槽线特征数组
  const notchLineArray = [];

  Object.keys(verticalLineMap).forEach((key) => {
    const postionArray = verticalLineMap[key];
    const fullLineItem = postionArray.find(
      (position) => position.n === trait.fullLineLength
    );
    const notchLineItem1 = postionArray.find(
      (position) => position.n === trait.notchLineLength.b
    );
    const notchLineItem2 = postionArray.find(
      (position) => position.n === trait.notchLineLength.a
    );
    if (fullLineItem) {
      fullLineArray.push({ x: key, other: fullLineItem });
    }
    if (notchLineItem1 && notchLineItem2) {
      notchLineArray.push({
        x: key,
        other: [notchLineItem1, notchLineItem2],
      });
    }
  });

  // 交叉求绝对值
  const absArray = [];

  for (let i = 0; i < fullLineArray.length; i++) {
    // 一边有缺口
    for (let j = 0; j < notchLineArray.length; j++) {
      const absDiff = Math.abs(fullLineArray[i].x - notchLineArray[j].x);
      // const ydiff = Math.abs(
      //   fullLineArray[i].other.s - notchLineArray[j].other.s
      // );
      if (absDiff > 83 && absDiff < 87) {
        absArray.push([fullLineArray[i], notchLineArray[j]]);
      }
    }
    // 两边没有缺口
    for (let j = i + 1; j < fullLineArray.length; j++) {
      // const ydiff = Math.abs(
      //   fullLineArray[i].other.s - fullLineArray[j].other.s
      // );
      const absDiff = Math.abs(fullLineArray[i].x - fullLineArray[j].x);
      if (absDiff > 83 && absDiff < 87) {
        absArray.push([fullLineArray[i], fullLineArray[j]]);
      }
    }
  }

  // 两边都有缺口
  for (let i = 0; i < notchLineArray.length; i++) {
    for (let j = i + 1; j < notchLineArray.length; j++) {
      // const ydiff = Math.abs(
      //   notchLineArray[i].other.s - notchLineArray[j].other.s
      // );
      const absDiff = Math.abs(notchLineArray[i].x - notchLineArray[j].x);
      if (absDiff > 83 && absDiff < 87) {
        absArray.push([notchLineArray[i], notchLineArray[j]]);
      }
    }
  }
  console.log(absArray);
  return absArray;
  // console.log(absArray[0].sort()[0]);
};

function crackVerificatCode(src, options = { debug: false }) {
  const { debug } = options;
  return imageloader(src).then((img) => {
    // 返回结果
    let result = {
      left: 0,
      debugCanvas: null,
    };
    // 获取图片数据
    const imageData = getImageData(img);

    // 二值图黑色坐标数组
    const blackPxArray = [];

    // 二值化图片数据
    const binData = getBinaryImageData(imageData, 100, null, (i) => {
      // 在黑色迭代器中，把像素坐标转化黑色的位置坐标，记录到数组中
      blackPxArray.push({
        x: Math.floor((i / 4) % img.width),
        y: Math.ceil(i / 4 / img.width),
      });
    });

    // 特征数据
    const blockLineArray = findBlock(blackPxArray);

    // 绘制特征 主要为了效果演示
    if (blockLineArray.length && blockLineArray[0].length) {
      result.left = blockLineArray[0][0].x;

      if (debug) {
        const blockArray = blockLineArray[0];
        for (let i = 0; i < blockArray.length; i++) {
          const x = blockArray[i].x;
          const o = blockArray[i].other;
          const otherInfo = Array.isArray(o) ? o : [o];
          for (let j = 0; j < otherInfo.length; j++) {
            for (let k = otherInfo[j].s - 1; k < otherInfo[j].y + 1; k++) {
              const pxIndex = (k * img.width + Number(x)) * 4;
              binData.data[pxIndex] = 255;
              binData.data[pxIndex + 1] = 0;
              binData.data[pxIndex + 2] = 0;
            }
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const c = canvas.getContext("2d");
        c.putImageData(binData, 0, 0);

        result.debugCanvas = canvas;
        console.log(result);
        return Promise.resolve(result);
      }
    } else {
      return Promise.reject(result);
    }
  });
}

module.exports = crackVerificatCode;
