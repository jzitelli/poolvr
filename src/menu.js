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

    var soundInput = document.getElementById('sound');
    soundInput.checked = POOLVR.config.soundVolume > 0;

    var volumeInput = document.getElementById('volume');
    volumeInput.value = POOLVR.config.soundVolume;

    volumeInput.addEventListener('change', function () {
        POOLVR.config.soundVolume = volumeInput.value;
        console.log('volume set to', POOLVR.config.soundVolume);
        POOLVR.synthSpeaker.volume = POOLVR.config.soundVolume;
        if (POOLVR.config.soundVolume > 0.0) {
            soundInput.checked = true;
        } else {
            soundInput.checked = false;
        }
    });

    soundInput.addEventListener('change', function () {
        if (soundInput.checked) {
            console.log('sound enabled');
            POOLVR.config.soundVolume = 0.25;
            POOLVR.synthSpeaker.volume = 0.25;
        } else {
            console.log('sound disabled');
            POOLVR.config.soundVolume = 0.0;
            POOLVR.synthSpeaker.volume = 0.0;
        }
        volumeInput.value = POOLVR.config.soundVolume;
    });

    POOLVR.vrDisplayIndicator = document.getElementById('vrDisplayIndicator');

    POOLVR.vrGamepadIndicator = document.getElementById('vrGamepadIndicator');

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
            // useShadowMapInput.checked = false;
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

    var vrButton = document.getElementById('vrButton');
    var _firstTime = true;
    vrButton.addEventListener('click', function () {
        if (!POOLVR.app.vrDisplay.isPresenting) {
            window.cancelAnimationFrame(POOLVR.requestID);
            POOLVR.app.vrEffect.requestPresent().then( function () {
                if (_firstTime) {
                    _firstTime = false;
                    POOLVR.synthSpeaker.speak("Hello. Welcome. To. Pool-ver.");
                }
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

            } else {

                POOLVR.vrDisplayIndicator.textContent = vrDisplay.displayName + ' available';
                POOLVR.vrDisplayIndicator.style['background-color'] = 'rgba(20, 160, 20, 0.8)';

            }

        } ).catch( function (err) {

            vrButton.style.display = 'none';
            vrButton.disabled = true;
            console.error(err);

        } );
    }
};
