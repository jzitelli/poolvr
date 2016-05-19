var fs = require('fs'),
    webdriver = require('selenium-webdriver');

var server = require('../server.js');

var firefox = new webdriver.Builder().forBrowser('firefox').build();
var chrome;

// try {
//  chrome = new webdriver.Builder().forBrowser('chrome').build();
// } catch (error) {
//  console.error(error);
// }

function writeScreenshot(data, file) {
    var base64Data = data.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync(file, base64Data, 'base64');
    console.log('wrote %s', file);
}

describe('WebVRApp', function () {

    describe('inFirefox', function () {

        beforeEach( function () {
            firefox.get(server.TEST_URL);
        } );

        afterEach( function (done) {
            if (this.screenshotName) {
                var file = 'test/screenshots/firefox/' + this.screenshotName + '.png';
                firefox.takeScreenshot().then( function (data) {
                    writeScreenshot(data, file);
                    done();
                } );
            } else {
                done();
            }
        }, 20000);

        it('enters fullscreen', function () {

            var fsButton = firefox.findElement(webdriver.By.id('fsButton'));

            fsButton.click();
            firefox.sleep(2000); // maybe there is a more robust way, listen to events?
            var fsElem = firefox.executeScript("return document.mozFullScreenElement;");

            expect(fsElem).not.toBeNull();

            this.screenshotName = 'it_enters_fullscreen';

        }, 20000);

        it('enters VR', function (done) {

            //firefox.executeScript("window.vrDisplay = null; navigator.getVRDisplays().then( function (displays) { if (displays[0].canPresent) window.vrDisplay = displays[0]; } );");
            //firefox.sleep(500);

            firefox.findElement(webdriver.By.id('vrButton')).then( function (vrButton) {

                vrButton.click();
                firefox.sleep(2000);
                var isPresenting = firefox.executeScript("return app.vrDisplay.isPresenting;");

                expect(isPresenting).toBeTrue();

                this.screenshotName = 'it_enters_VR';

                done();

            } ).catch( function (error) {

                var hasVRDisplay = firefox.executeScript("return app.vrDisplay;");
                if (hasVRDisplay) {

                    // the VRDisplay can't present
                    var canPresent = firefox.executeScript("return app.vrDisplay.capabilities.canPresent;");

                    expect(!canPresent).toBeTrue();

                    done();

                } else {

                    // no VRDisplay is available
                    console.warn('no VRDisplay is available');
                    done();

                }

            } );

        }, 20000);

    });

    afterAll( function () {
        if (chrome) chrome.quit();
        firefox.quit();
    } );

});
