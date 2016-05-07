/* global POOLVR */
POOLVR.setupMenu = function () {
    "use strict";

    function onFocus(evt) {
        POOLVR.keyboard.enabled = false;
    }
    function onBlur(evt) {
        POOLVR.keyboard.enabled = true;
    }

    var inputs = document.querySelectorAll('input');
    //inputs = Array.prototype.push.apply(inputs, document.querySelectorAll('button'));
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

    useBasicMaterialsInput.addEventListener('change', function (evt) {
        POOLVR.config.useBasicMaterials = useBasicMaterialsInput.checked;
        POOLVR.saveConfig(POOLVR.profile);
        if (!POOLVR.config.useBasicMaterials && !(POOLVR.config.useSpotLight || POOLVR.config.usePointLight)) {
            useSpotLightInput.checked = true;
            POOLVR.config.useSpotLight = true;
            POOLVR.centerSpotLight.visible = true;
        }
        POOLVR.switchMaterials(POOLVR.config.useBasicMaterials);
    }, false);

    useShadowMapInput.addEventListener('change', function (evt) {
        POOLVR.config.useShadowMap = useShadowMapInput.checked;
        POOLVR.saveConfig(POOLVR.profile);
        if (window.confirm('This change requires a page reload to take effect - reload now?')) {
            document.location.reload();
        }
    }, false);

    usePointLightInput.addEventListener('change', function (evt) {
        POOLVR.config.usePointLight = usePointLightInput.checked;
        POOLVR.saveConfig(POOLVR.profile);
        if (window.confirm('This change requires a page reload to take effect - reload now?')) {
            document.location.reload();
        }
    }, false);

    useSpotLightInput.addEventListener('change', function (evt) {
        POOLVR.config.useSpotLight = useSpotLightInput.checked;
        POOLVR.saveConfig(POOLVR.profile);
        POOLVR.centerSpotLight.visible = POOLVR.config.useSpotLight;
    }, false);

    // TODO: regular expression format check
    var leapAddressInput = document.getElementById('leapAddress');
    leapAddressInput.value = 'localhost';
    var host = leapAddressInput.value;
    POOLVR.config.toolOptions.host = host;
    leapAddressInput.addEventListener('change', onLeapAddressChange, false);
    function onLeapAddressChange() {
        var host = leapAddressInput.value;
        POOLVR.config.toolOptions.host = host;
        POOLVR.saveConfig(POOLVR.profile);
        POOLVR.leapController.connection.host = host;
        POOLVR.leapController.connection.disconnect(true);
        POOLVR.leapController.connect();
    }

    var profileNameInput = document.getElementById('profileName');
    profileNameInput.value = POOLVR.profile;
    profileNameInput.addEventListener('change', function (evt) {
        POOLVR.profile = profileNameInput.value;
        POOLVR.saveConfig(POOLVR.profile);
    }, false);

    var vrButton = document.getElementById('vrButton');
    vrButton.addEventListener('click', function () {
        POOLVR.app.toggleVR();
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

    // fsButton.disabled = false;
    // vrButton.disabled = true;
};
