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
    useBasicMaterialsInput.addEventListener('change', function (evt) {
        POOLVR.config.useBasicMaterials = useBasicMaterialsInput.checked;
        POOLVR.saveConfig(POOLVR.profile);
        POOLVR.switchMaterials(POOLVR.config.useBasicMaterials);
    }, false);

    var useShadowMapInput = document.getElementById('useShadowMap');
    useShadowMapInput.checked = POOLVR.config.useShadowMap;
    useShadowMapInput.addEventListener('change', function (evt) {
        POOLVR.config.useShadowMap = useShadowMapInput.checked;
        POOLVR.saveConfig(POOLVR.profile);
        if (window.confirm('This change requires a page reload to take effect - reload now?')) {
            document.location.reload();
        }
    }, false);

    var usePointLightInput = document.getElementById('usePointLight');
    usePointLightInput.checked = POOLVR.config.usePointLight;
    usePointLightInput.addEventListener('change', function (evt) {
        POOLVR.config.usePointLight = usePointLightInput.checked;
        POOLVR.saveConfig(POOLVR.profile);
        if (window.confirm('This change requires a page reload to take effect - reload now?')) {
            document.location.reload();
        }
    }, false);

    var useSpotLightInput = document.getElementById('useSpotLight');
    useSpotLightInput.checked = POOLVR.config.useSpotLight;
    useSpotLightInput.addEventListener('change', function (evt) {
        POOLVR.config.useSpotLight = useSpotLightInput.checked;
        POOLVR.saveConfig(POOLVR.profile);
        if (window.confirm('This change requires a page reload to take effect - reload now?')) {
            document.location.reload();
        }
    }, false);

    // TODO: regular expression format check
    var leapAddressInput = document.getElementById('leapAddress');
    leapAddressInput.value = '127.0.0.1';
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

    // fsButton.disabled = false;
    // vrButton.disabled = true;
};
