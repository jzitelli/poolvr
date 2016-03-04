POOLVR.setupMenu = function () {
    "use strict";
    var inputs = document.querySelectorAll('input');
    function onFocus(evt) {
        POOLVR.keyboard.enabled = false;
    }
    function onBlur(evt) {
        POOLVR.keyboard.enabled = true;
    }
    for (var i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener('focus', onFocus);
        inputs[i].addEventListener('blur', onBlur);
    }

    var useBasicMaterialsInput = document.getElementById('useBasicMaterials');
    useBasicMaterialsInput.checked = POOLVR.config.useBasicMaterials;
    useBasicMaterialsInput.addEventListener('change', function (evt) {
        POOLVR.config.useBasicMaterials = useBasicMaterialsInput.checked;
        POOLVR.saveConfig(POOLVR.profile);
        POOLVR.switchMaterials(POOLVR.config.useBasicMaterials);
    });

    var useShadowMapInput = document.getElementById('useShadowMap');
    useShadowMapInput.checked = POOLVR.config.useShadowMap;
    useShadowMapInput.addEventListener('change', function (evt) {
        POOLVR.config.useShadowMap = useShadowMapInput.checked;
        POOLVR.saveConfig(POOLVR.profile);
        if (window.confirm('This change requires a page reload to take effect - reload now?')) {
            document.location.reload();
        }
    });

    POOLVR.leapIndicator = document.getElementById('leapIndicator');

    // TODO: regular expression format check
    var leapAddressInput = document.getElementById('leapAddress');
    leapAddressInput.value = 'localhost';
    leapAddressInput.addEventListener('change', function (evt) {
        POOLVR.leapController.connection.host = leapAddressInput.value;
        POOLVR.leapController.connection.disconnect(true);
        POOLVR.leapController.connect();
        POOLVR.saveConfig(POOLVR.profile);
    });

    var profileNameInput = document.getElementById('profileName');
    profileNameInput.value = POOLVR.profile;
    profileNameInput.addEventListener('change', function (evt) {
        POOLVR.profile = profileNameInput.value;
        POOLVR.saveConfig(POOLVR.profile);
    });

    var overlay = document.getElementById('overlay');
    var startButton = document.getElementById('start');

    startButton.addEventListener('click', function () {
        overlay.style.display = 'none';
        POOLVR.startTutorial();
    });
};
