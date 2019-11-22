/**
 * 下载掘金【我的收藏集】文章为 PDF 文件
 * 含对图片 lazyload 的处理
 * SOURCE_URL 为【我的收藏集】链接
 */
const puppeteer = require('puppeteer');
const mkdirp = require('mkdirp');
const axios = require('axios');
const BASE_URL = 'https://juejin.im';
const SOURCE_URL = 'https://juejin.im/collection/5dd56bd0e51d4505fd7facd2';

const printJuejinBooks = async (userName, password, saveDir = './books') => {
  if (!userName) {
    throw new Error('请输入用户名');
  }
  if (!password) {
    throw new Error('请输入密码');
  }
  try {
    // 默认网站图片为懒加载方式
    const config = {
      lazyLoad: true
    }
    const result = {
      status: null,
      message: null
    }
    // 设置统一的视窗大小
    const viewport = {
      width: 1376,
      height: 768
    };

    console.log('启动浏览器');
    const browser = await puppeteer.launch({
      // 关闭无头模式，方便我们看到整个无头浏览器执行的过程
      // 注意若调用了 Page.pdf 即保存为 pdf，则需要保持为无头模式
      headless: false,
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
      console.log(index + 1 + '.' + item.title);
    });

    for (let article of books) {
      const articlePage = await browser.newPage();
      articlePage.setViewport(viewport);
      await articlePage.goto(`${BASE_URL}${article.href}`, {
        waitUtil: 'networkidle2'
      });

      if (config.lazyLoad) {
        var maxScroll = await articlePage.evaluate(function () {
          return Promise.resolve(Math.max(document.body.scrollHeight, document.body.offsetHeight,
            document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight) - window.innerHeight);
        }).catch(function () {
          log('BAD', 'Lazy load failed due to an error while getting the scroll height.', 1);
        });

        var fullScrolls = Math.floor(maxScroll / viewport.height);
        // how many times full scroll needs to be done
        var lastScroll = maxScroll % viewport.height;
        // amount left to get to the bottom of the page after doing the full scrolls

        // do full scrolls if there is any
        for (var i = 1; i <= fullScrolls; i++) {
          await articlePage.evaluate(function (i, viewportHeight) {
            return Promise.resolve(window.scrollTo(0, i * viewportHeight));
          }, i, viewport.height).catch(function () {
            result.status = 'BAD';
            result.message = 'Promise rejected while scrolling for lazy load images.';
          });

          await articlePage.waitForNavigation({
            'waitUntil': 'networkidle2',
            // 'networkIdleTimeout': 200
          }).catch(function () {
            result.status = 'BAD';
            result.message = 'Promise rejected while waiting for navigation 1';
          });
        }

        // do last scroll if there is any
        if (lastScroll > 0) {
          await articlePage.evaluate(function (maxScroll) {
            return Promise.resolve(window.scrollTo(0, maxScroll + 25));
          }, maxScroll).catch(function () {
            result.status = 'BAD';
            result.message = 'Promise rejected while last scrolling for lazy load images.';
          });
        }

        await articlePage.waitForNavigation({
          'waitUntil': 'networkidle2'
        }).catch(function (error) {
          result.status = 'BAD';
          result.message = 'Promise rejected while waiting for navigation 2';
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

      const dirPath = `${saveDir}/${article.title}`;
      const fileName = `${article.title.replace(/\//g, '、')}.pdf`;
      const filePath = `${dirPath}/${fileName}`;
      mkdirp.sync(dirPath);

      // await page.emulateMedia('screen');
      // await articlePage.pdf({
      //   path: filePath,
      //   format: 'A4',
      //   printBackground: true
      // });
      console.log(`保存成功: ${filePath}`);
      articlePage.close();
    }

    browser.close();
  } catch (e) {
    console.error(e);
  }
};

const USER = process.argv[2];
const PASSWORD = process.argv[3];
const SAVE_DIR = process.argv[4];

if (!USER || !PASSWORD) {
  console.log('invalid user or password');
  process.exit();
}

printJuejinBooks(USER, PASSWORD, SAVE_DIR);
