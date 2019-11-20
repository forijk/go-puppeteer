const http = require('http');
const ci = require('cheerio');
const iconv = require('iconv-lite');

function func(callback, http_res) {
  http.get('http://www.ygdy8.net/html/gndy/oumei/index.html', res => {
      const statusCode = res.statusCode;

      if (statusCode !== 200) {
        res.resume();
        return;
      }
      let chunks = [];
      var length = 0;
      res.on('data', chunk => {
        chunks.push(chunk);
        length += chunk.length;
      });
      res.on('end', () => {
        var shtml_a = Buffer.concat(chunks, length);
        var shtml = iconv.decode(shtml_a, 'gb2312');
        var $ = ci.load(shtml, {
          decodeEntities: false
        });
        var lists = $('div.co_content8 table');

        var rets = [];
        for (var i = 0; i < lists.length; i++) {
          let name = $('a.ulink', lists[i]).text();
          let url = $('a.ulink', lists[i]).eq(1).prop('href');
          rets.push({
            name: name,
            url: 'http://www.ygdy8.net/' + url
          })
        }
        // return rets;
        callback && callback(rets, http_res);
      });
    })
    .on('error', function () {
      //...
    });
}

function getData(data, res) {
  res.writeHead(200, {
    'Content-Type': 'text/html;charset=utf-8'
  });
  console.log(data); //   通过传递res参数，来获取请求的数据并展示前台。。。
  for (var i in data) {
    res.write('<span style="color:white;background:black;">' + data[i].name + '</span><br />' + data[i].url + '<br />');
  }
  res.end('Hello!!!~~~');
}

const server = http.createServer((req, res) => {

  func(getData, res);

  // res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
  // for (var i in rets) {
  //     res.write('<span style="color:white;background:black;">' + rets[i].name + '</span><br />' + rets[i].url + '<br />');
  // }
  // res.end('hello!');
}).listen(8080);
console.log('Running!');
