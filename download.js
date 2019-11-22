/**
 * 下载掘金【我的收藏集】文章为 PDF 文件
 * 含对懒加载图片 lazyload 的处理，默认开启
 * SOURCE_URL 为【我的收藏集】链接
 */
const puppeteer = require('puppeteer');
const mkdirp = require('mkdirp');
const axios = require('axios');
const ProgressBar = require('progress');

const BASE_URL = 'https://juejin.im';
const SOURCE_URL = 'https://juejin.im/collection/5dd56bd0e51d4505fd7facd2';


process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

const printJuejinBooks = async (userName, password, isLazyload = true, saveDir = './books') => {
  if (!userName) {
    throw new Error('请输入用户名');
  }
  if (!password) {
    throw new Error('请输入密码');
  }
  try {
    // 设置统一的视窗大小
    const viewport = {
      width: 1376,
      height: 768
    };

    console.log('启动浏览器');
    const browser = await puppeteer.launch({
      // 关闭无头模式，便于看到整个无头浏览器的执行过程
      // 注意若调用了 Page.pdf 即保存为 pdf，则需要保持为无头模式
      // headless: false
    });

    console.log('打开新页面');
    const page = await browser.newPage();
    page.setViewport(viewport);

    console.log('进入登录地址');

    const postData = {
      password,
      phoneNumber: userName
    }
    // 不用设置 headers
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.1 (KHTML, like Gecko) Chrome/14.0.835.163 Safari/535.1'
    }

    axios.post('https://juejin.im/auth/type/phoneNumber', postData, {
      headers
    }).then(res => {
      console.log('登录成功!');
      console.log('---> 掘金用户名: ', res.data.user && res.data.user.username);
    }).catch(err => {
      console.log('登录失败: ', err);
      return
    })

    await page.goto(SOURCE_URL);

    await page.waitForSelector('.collection-view');
    const books = await page.$eval('.collection-view', element => {
      const booksHTMLCollection = element.querySelectorAll('.content-box');
      const booksElementArray = Array.prototype.slice.call(booksHTMLCollection);
      const books = booksElementArray.map(item => {
        const a = item.querySelector('.title-row .title');
        return {
          href: a.getAttribute('href'),
          title: a.innerText
        };
      });
      return books;
    });
    console.log(`收藏集上共找到${books.length}篇文章:`);
    books.forEach((item, index) => {
      console.log('  ', index + 1 + '.' + item.title);
    });

    for (let article of books) {
      const articlePage = await browser.newPage();
      articlePage.setViewport(viewport);

      await articlePage.goto(`${BASE_URL}${article.href}`);

      if (isLazyload) {
        console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
        console.log('开始图片懒加载识别, 请稍后...');
        var maxScroll = await articlePage.evaluate(() => {
          return Promise.resolve(
            Math.max(document.body.scrollHeight, document.body.offsetHeight,
              document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight) - window.innerHeight
          );
        }).catch((err) => {
          console.log(err);
        });

        // how many times full scroll needs to be done
        var fullScrolls = Math.floor(maxScroll / viewport.height);
        console.log("预计总用时: ", fullScrolls, 's')
        // amount left to get to the bottom of the page after doing the full scrolls
        var lastScroll = maxScroll % viewport.height;
        // progress
        var bar = new ProgressBar('  Timing [:bar] :percent :etas', {
          complete: '=',
          incomplete: ' ',
          total: fullScrolls
        });

        // do full scrolls if there is any
        for (var i = 1; i <= fullScrolls; i++) {
          await articlePage.evaluate((i, viewportHeight) => {
            return Promise.resolve(window.scrollTo(0, i * viewportHeight));
          }, i, viewport.height).catch(err => {
            console.log(err);
          });
          await articlePage.waitFor(1000).catch(err => {
            console.log(err);
          });
          bar.tick(1);
        }
        // do last scroll if there is any
        if (lastScroll > 0) {
          await articlePage.evaluate(maxScroll => {
            return Promise.resolve(window.scrollTo(0, maxScroll + 25));
          }, maxScroll).catch(err => {
            console.log(err);
          });
        }
        await articlePage.waitFor(2000).catch(err => {
          console.log(err);
        });
      }
      await articlePage.waitForSelector('.main-container');
      await articlePage.$eval('body', body => {
        body.querySelector('.main-header-box').style.display = 'none';
        // 隐藏评论列表
        // body.querySelector('.comment-list-box').style.display = 'none';
        body.querySelector('.recommended-area').style.display = 'none';
        body.querySelector('.tag-list-box').style.display = 'none';
        body.querySelector('.article-banner').style.display = 'none';
        body.querySelector('.meiqia-btn').style.display = 'none';
        body.querySelector('.footer-author-block').style.display = 'none';
        Promise.resolve();
      });

      const fileName = `${article.title.replace(/\//g, '、')}.pdf`;
      const filePath = `${saveDir}/${fileName}`;
      mkdirp.sync(saveDir);

      console.log('开始转换为 PDF 文件...');
      await page.emulateMedia('screen');
      await articlePage.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true
      });
      console.log(`保存成功: ${filePath}`);
      // Protocol error (Target.closeTarget): Target closed.
      // articlePage.close();
    }
    console.log('恭喜您! 全部下载成功！');
    browser.close();
  } catch (err) {
    console.error(err);
  }
};

const USER = process.argv[2];
const PASSWORD = process.argv[3];
const SAVE_DIR = process.argv[4];
const IS_LAZYLOAD = process.argv[5];

if (!USER || !PASSWORD) {
  console.log('invalid user or password');
  process.exit();
}

printJuejinBooks(USER, PASSWORD, IS_LAZYLOAD, SAVE_DIR);
