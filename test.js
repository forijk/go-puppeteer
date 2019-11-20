// const fs = require('fs')
const express = require('express');
const cheerio = require('cheerio')
const axios = require('axios')
const iconv = require('iconv-lite')

const app = express();

const baseUrl = 'https://www.dytt8.net';

app.get('/', (req, res) => {
  const list = []
  const arr = []
  // 1-204
  for (let i = 0; i < 3; i++) {
    console.log(`当前是第${i}页`)
    arr.push(getHtml(i).then(str => {
      const $ = cheerio.load(str, {
        decodeEntities: false
      })

      $(".co_content8 .ulink").each((index, item) => {
        const tmpData = {
          link: baseUrl + $(item).attr('href'),
          text: $(item).text()
        }
        list.push(tmpData)
      })
      // console.log(list.length)
      // res.send(list)

    }))
  }
  Promise.all(arr).then(args => {
    console.log(args);
    console.log(list);
    console.log(list.length);
    res.send(list)
  })
})
async function getHtml(i = 0) {
  const url = `${baseUrl}/html/gndy/dyzz/list_23_${i + 1}.html`
  const res = await axios({
    url,
    responseType: 'stream'
  })
  return new Promise(resolve => {
    const chunks = []
    res.data.on('data', chunk => {
      console.log(1111111);
      chunks.push(chunk)
    })
    res.data.on('end', () => {
      console.log(2222222);
      const buffer = Buffer.concat(chunks)
      const str = iconv.decode(buffer, 'gb2312')
      resolve(str)
    })
  })
}

app.listen(3000, () => {
  console.log('[Server at] : http://127.0.0.1:3000');
});
