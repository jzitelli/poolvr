/* global POOLVR */

// TODO: use angular.js or some other MVC framework

POOLVR.setupMenu = function () {
    "use strict";

    var overlay = document.getElementById('overlay');

    POOLVR.toggleMenu = function () {
        if (overlay.style.display === 'none') {
            overlay.style.display = 'block';
        } else {
            overlay.style.display = 'none';
        }
    };

    function onFocus() {
        POOLVR.keyboard.enabled = false;
    }
    function onBlur() {
        POOLVR.keyboard.enabled = true;
    }

    var inputs = document.querySelectorAll('input');
    for (var i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener('focus', onFocus, false);
        inputs[i].addEventListener('blur', onBlur, false);
    }

    var useBasicMaterialsInput = document.getElementById('useBasicMaterials');
    useBasicMaterialsInput.checked = POOLVR.config.useBasicMaterials;

    var useShadowMapInput = document.getElementById('useShadowMap');
    useShadowMapInput.checked = POOLVR.config.useShadowMap;

    var usePointLightInput = document.getElementById('usePointLight');
    usePointLightInput.checked = POOLVR.config.usePointLight;

    var useSpotLightInput = document.getElementById('useSpotLight');
    useSpotLightInput.checked = POOLVR.config.useSpotLight;

    useBasicMaterialsInput.addEventListener('change', function () {
        POOLVR.config.useBasicMaterials = useBasicMaterialsInput.checked;
        if (!POOLVR.config.useBasicMaterials && !(POOLVR.config.useSpotLight || POOLVR.config.usePointLight)) {
            useSpotLightInput.checked = true;
            POOLVR.config.useSpotLight = true;
            POOLVR.centerSpotLight.visible = true;
        }
        POOLVR.saveConfig(POOLVR.profile);
        POOLVR.switchMaterials(POOLVR.config.useBasicMaterials);
    }, false);

    useShadowMapInput.addEventListener('change', function () {
        POOLVR.config.useShadowMap = useShadowMapInput.checked;
        POOLVR.saveConfig(POOLVR.profile);
        if (window.confirm('This change requires a page reload to take effect - reload now?')) {
            document.location.reload();
        }
    }, false);

    usePointLightInput.addEventListener('change', function () {
        POOLVR.config.usePointLight = usePointLightInput.checked;
        POOLVR.saveConfig(POOLVR.profile);
        POOLVR.pointLight.visible = POOLVR.config.usePointLight;
    }, false);

    useSpotLightInput.addEventListener('change', function () {
        POOLVR.config.useSpotLight = useSpotLightInput.checked;
        POOLVR.saveConfig(POOLVR.profile);
        POOLVR.centerSpotLight.visible = POOLVR.config.useSpotLight;
    }, false);

    // TODO: regular expression format check
    var leapAddressInput = document.getElementById('leapAddress');
    leapAddressInput.value = POOLVR.config.toolOptions.host || 'localhost';
    leapAddressInput.addEventListener('change', onLeapAddressChange, false);
    function onLeapAddressChange() {
        var host = leapAddressInput.value;
        POOLVR.config.toolOptions.host = host;
        POOLVR.saveConfig(POOLVR.profile);
        POOLVR.leapTool.leapController.connection.host = host;
        POOLVR.leapTool.leapController.connection.disconnect(true);
        POOLVR.leapTool.leapController.connect();
    }

    var vrButton = document.getElementById('vrButton');
    vrButton.addEventListener('click', function () {
        if (!POOLVR.app.vrDisplay.isPresenting) {
            window.cancelAnimationFrame(POOLVR.requestID);
            POOLVR.app.vrEffect.requestPresent().then( function () {
                POOLVR.app.vrEffect.requestAnimationFrame(POOLVR.animate);
            } );
        } else {
            POOLVR.app.vrEffect.cancelAnimationFrame(POOLVR.requestID);
            POOLVR.app.vrEffect.exitPresent().then( function () {
                window.requestAnimationFrame(POOLVR.animate);
            } );
        }
        vrButton.blur();
    }, false);

    var fsButton = document.getElementById('fsButton');
    fsButton.addEventListener('click', function () {
        POOLVR.app.toggleFullscreen();
    }, false);

    var vrDisplay = null;

    if (!navigator.getVRDisplays) {

        vrButton.style.display = 'none';
        vrButton.disabled = true;
        console.warn('navigator does not provide getVRDisplays');

    } else {

        navigator.getVRDisplays().then( function (vrDisplays) {

            for (var i = 0; i < vrDisplays.length; i++) {
                console.log(vrDisplays[i]);
                if (vrDisplays[i].capabilities && vrDisplays[i].capabilities.canPresent) {
                    vrDisplay = vrDisplays[i];
                    break;
                }
            }
            if (!vrDisplay) {

                vrButton.style.display = 'none';
                vrButton.disabled = true;

            }

        } ).catch( function (err) {

            vrButton.style.display = 'none';
            vrButton.disabled = true;
            console.error(err);

        } );
    }
};
