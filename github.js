const puppeteer = require('puppeteer');
const argum = require('argum');

exports.init = function () {
    return (async function() {
        var config = {
            url:            argum.get('--url', true, false),
            path:           argum.get('--path', false, 'image.png'),
            viewportWidth:  argum.get('--viewportWidth', false, 1280),
            viewportHeight: argum.get('--viewportHeight', false, 800),
            mobile:         argum.get('--mobile', false, false),
            userAgent:      argum.get('--userAgent', false, false),
            pdf:            argum.get('--pdf', false, false),
            mediaTypePrint: argum.get('--mediaTypePrint', false, false),
            lazyLoad:       argum.get('--lazyLoad', false, false)
        };

        var result = {
            status: 'OK'
        };

        /**
         * Logs json to the console and if required terminates the process
         *
         * @param status
         * @param message
         * @param terminate
         */
        function log(status, message, terminate)
        {
            result.status = status;

            if (message)
            {
                result.message = message;
            }

            console.log(result);

            if (terminate)
            {
                process.exit(terminate);
            }
        }

        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // set the media type
        if (config.mediaTypePrint)
        {
            await page.emulateMedia('print');
        }
        else
        {
            await page.emulateMedia('screen');
        }

        // set the user agent if one is provided
        if (config.userAgent)
        {
            await page.setUserAgent(config.userAgent);
        }

        if (config.mobile)
        {
            // set user agent to be as Chrome 60 for Android
            await page.setUserAgent('Mozilla/5.0 (Linux; Android 5.1; XT1039 Build/LPBS23.13-17.6-1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.116 Mobile Safari/537.36');

            // set mobile viewport
            await page.setViewport({width: 320, height: 480});
        }
        else
        {
            await page.setViewport({width: parseInt(config.viewportWidth), height: parseInt(config.viewportHeight)}); // set default view port size
        }

        await page.goto(config.url, {"waitUntil" : "networkidle", "networkIdleTimeout" : 1500}).catch(function() {
            log('BAD', 'Error while loading up the url.', 1);
        });

        // attempt to load lazy load images
        if (config.lazyLoad)
        {
            var maxScroll = await page.evaluate(function() {
                return Promise.resolve(Math.max( document.body.scrollHeight, document.body.offsetHeight,
                        document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight ) - window.innerHeight);
            }).catch(function() {
                log('BAD', 'Lazy load failed due to an error while getting the scroll height.', 1);
            });

            var fullScrolls = Math.floor(maxScroll / config.viewportHeight); // how many times full scroll needs to be done
            var lastScroll = maxScroll % config.viewportHeight; // amount left to get to the bottom of the page after doing the full scrolls

            // do full scrolls if there is any
            for (var i = 1; i <= fullScrolls; i++)
            {
                await page.evaluate(function (i, viewportHeight) {
                    return Promise.resolve(window.scrollTo(0, i*viewportHeight));
                }, i, config.viewportHeight).catch(function() {
                    result.status = 'BAD';
                    result.message = 'Promise rejected while scrolling for lazy load images.';
                });

                await page.waitForNavigation({'waitUntil' : 'networkidle', 'networkIdleTimeout' : 200}).catch(function () {
                    result.status = 'BAD';
                    result.message = 'Promise rejected while waiting for navigation 1';
                });
            }

            // do last scroll if there is any
            if (lastScroll > 0)
            {
                await page.evaluate(function (maxScroll) {
                    return Promise.resolve(window.scrollTo(0, maxScroll + 25));
                }, maxScroll).catch(function() {
                    result.status = 'BAD';
                    result.message = 'Promise rejected while last scrolling for lazy load images.';
                });
            }

            await page.waitForNavigation({'waitUntil' : 'networkidle'}).catch(function (error) {
                result.status = 'BAD';
                result.message = 'Promise rejected while waiting for navigation 2';
            });
        }

        if (config.pdf)
        {
            // save pdf
            await page.screenshot({path: config.path, fullPage: true});
        }
        else
        {
            // save screenshot
            await page.screenshot({path: config.path, fullPage: true});
        }

        browser.close();
        console.log(result);
    })();
};
