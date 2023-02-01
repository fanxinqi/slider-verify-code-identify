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
