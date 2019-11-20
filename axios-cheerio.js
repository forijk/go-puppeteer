const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

const baseUrl = 'https://www.dytt8.net';
// 1-204
const ttUrl = 'https://www.dytt8.net/html/gndy/dyzz/list_23_1.html';


app.get('/', (req, res) => {
  axios.get(ttUrl, {
    // headers: {
    //   "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36"
    // }
  }).then((response) => {
    const html = response.data;
    // 加载 html 内容
    const $ = cheerio.load(html);
    let list = [];
    $(".co_content8 .ulink").each((index, item) => {
      const tmpData = {
        link: baseUrl + $(item).attr('href'),
        text: $(item).text()
      };
      list.push(tmpData);
    });
    // 输出列表
    console.log(list);
    res.send(list);
  }).catch((err) => {
    console.log(err);
    res.send(err);
  })
});

app.listen(3000, () => {
  console.log('[Server at] : http://127.0.0.1:3000');
});
