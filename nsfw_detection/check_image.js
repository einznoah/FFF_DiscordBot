const axios = require('axios');
const tf = require('@tensorflow/tfjs-node');
const nsfw = require('nsfwjs');

const isNSFW = async (img_url) => {
    const pic = await axios.get(img_url, {
        responseType: 'arraybuffer',
    })
    tf.enableProdMode();
    const model = await nsfw.load()
    const image = await tf.node.decodeImage(pic.data, 3)
    const predictions = await model.classify(image)
    image.dispose()

    function sortFunction(a, b) {
        if (a[0] === b[0]) {
            return 0;
        }
        else {
            return (a[0] < b[0]) ? -1 : 1;
        }
    }
    return predictions.sort(sortFunction)[0]['className'];
}
exports.isNSFW = isNSFW;