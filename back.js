const fs = require('fs')
const cheerio = require('cheerio')
const axios = require('axios')
const iconv = require('iconv-lite')

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

const baseUrl = 'https://www.dytt8.net';

async function getHtml(i = 0) {
  // const url = `${baseUrl}/html/gndy/dyzz/list_23_${i + 1}.html`
  // const url = 'https://www.baidu.com'
  const url = 'https://www.dytt8.net/html/gndy/dyzz/list_23_1.html'
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

let list = []

async function fetchData() {
  try {
    // 1-204
    for (let i = 0; i < 3; i++) {
      console.log(`当前是第${i}页`)
      const html = await getHtml(i)
      const $ = cheerio.load(html, {
        decodeEntities: false
      })

      $(".co_content8 .ulink").each((index, item) => {
        const tmpData = {
          link: baseUrl + $(item).attr('href'),
          text: $(item).text()
        }
        list.push(tmpData);
      })
      console.log(`当前是第${i}页111111111`)
    }
  } catch (error) {
    console.log(error);
  }
  // console.log(list);
  console.log(list.length);
  fs.writeFileSync('data.txt', JSON.stringify(list))
}

fetchData()
