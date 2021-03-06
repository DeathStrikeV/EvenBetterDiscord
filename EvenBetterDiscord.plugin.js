//META{"name":"EvenBetterDiscord"}*//

// Self Installer by noodlebox (https://gist.github.com/noodlebox/21cdde481cb812cf212c352a4ce5289b)
/* @cc_on
@if (@_jscript)
    // Offer to self-install for clueless users that try to run this directly.
    var shell = WScript.CreateObject("WScript.Shell");
    var fs = new ActiveXObject("Scripting.FileSystemObject");
    var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\\BetterDiscord\\plugins");
    var pathSelf = WScript.ScriptFullName;
    // Put the user at ease by addressing them in the first person
    shell.Popup("It looks like you mistakenly tried to run me directly. (don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
    if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
        shell.Popup("I'm in the correct folder already.\nJust reload Discord with Ctrl+R.", 0, "I'm already installed", 0x40);
    } else if (!fs.FolderExists(pathPlugins)) {
        shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
    } else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
        fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
        // Show the user where to put plugins in the future
        shell.Exec("explorer " + pathPlugins);
        shell.Popup("I'm installed!\nJust reload Discord with Ctrl+R.", 0, "Successfully installed", 0x40);
    }
    WScript.Quit();
@else @*/

/* eslint no-use-before-define: 0 */
/* eslint no-empty-function: 0 */
/* eslint spaced-comment: 0 */

let request = require(`request`);
let fs = require(`fs`);

let EvenBetterDiscord = function() {
    this.targetAPI = `https://api.github.com/repos/Skykurohi/BetterDiscordApp/commits/master`;
    this.targetURL = `https://raw.githubusercontent.com/Skykurohi/BetterDiscordApp/master/data/emotedata_ffz.json`;

    this.bdPath = `${process.platform === `win32`
        ? process.env.APPDATA : process.platform === `darwin`
            ? `${process.env.HOME}/Library/Preferences/` : `/var/local/`}/BetterDiscord/`;

    this.preferencesFile = `${this.bdPath}/EBD_Preferences.json`;
    this.emotesFile = `${this.bdPath}/EBD_Emotes.json`;
    this.defaultEmotesFile = `${this.bdPath}/emotes_ffz.json`;
};

EvenBetterDiscord.prototype.start = function() {
    setTimeout(this.loadEBDFiles.bind(this), 10000);
};

EvenBetterDiscord.prototype.loadEBDFiles = function() {
    let readPreferencesFile = function(err, data) {
        if (data) { this.currentHash = JSON.parse(data).currentHash; } else { this.currentHash = ``; }

        if (this.currentHash === `ignore`) {
            this.loadEmotes(this.emotesFile);
            return;
        }

        request({
            "url"     : this.targetAPI,
            "headers" : {"User-Agent": `Skykurohi`},
        }, requestRepoHash.bind(this));
    };

    let requestRepoHash = function(error, response, body) {
        if (response.statusCode !== 200) {
            this.loadEmotes(this.emotesFile);
            return;
        }

        this.latestHash = JSON.parse(body).sha;

        if (this.currentHash === this.latestHash) {
            this.loadEmotes(this.emotesFile);
            return;
        }

        request(this.targetURL, downloadEmotesFile.bind(this));
    };

    let downloadEmotesFile = function(error, response, body) {
        if (response.statusCode !== 200) {
            this.loadEmotes(this.emotesFile);
            return;
        }

        fs.writeFile(this.emotesFile, body, saveEmotesFile.bind(this));
    };

    let saveEmotesFile = function(err) {
        if (!err) {
            // console.log("Retreived new emotes file!");
            fs.writeFile(this.preferencesFile, JSON.stringify({"currentHash": this.latestHash}), () => {});
        }

        this.loadEmotes(this.emotesFile);
    };

    fs.readFile(this.preferencesFile, `utf8`, readPreferencesFile.bind(this));
};

EvenBetterDiscord.prototype.loadEmotes = function(targetFile) {
    fs.readFile(targetFile, `utf8`, (err, data) => {
        if (data) {
            let emoteData = JSON.parse(data);

            if (!emoteData) {
                console.log(`Failed to parse emotes file!`);
                return;
            }

            window.emotesFfz = emoteData;

            // BandagedBetterDiscord Fix
            if (window.bdEmotes && window.bdEmotes.FrankerFaceZ) {
                for (let emote in window.emotesFfz) { window.bdEmotes.FrankerFaceZ[emote] = `https://cdn.frankerfacez.com/emoticon/${window.emotesFfz[emote]}/1`; }
            }
            console.log(`Loaded emotes file!`);

            //this.fixBrokenFavorites();
        }
    });
};

EvenBetterDiscord.prototype.fixBrokenFavorites = function() {
    let result;
    let regex = new RegExp(`"([\\w!]+(?:~\\d+)?)":"https:\\/\\/cdn\\.frankerfacez\\.com\\/emoticon\\/\\d*\\/`, `g`);
    let brokenFavorites = atob(bdStorage.get(`bdfavemotes`));
    let fixedFavorites = brokenFavorites;

    if (!brokenFavorites) { return; }

    while (result = regex.exec(brokenFavorites)) {
        if (!emotesFfz[result[1]]) { continue; }

        let replacementRegex = new RegExp(`"${result[1]}":"https:\\/\\/cdn\\.frankerfacez\\.com\\/emoticon\\/\\d*\\/`, `g`);
        let replacementString = `"${result[1]}":"https://cdn.frankerfacez.com/emoticon/${emotesFfz[result[1]]}/`;
        fixedFavorites = fixedFavorites.replace(replacementRegex, replacementString);
    }

    bdStorage.set(`bdfavemotes`, btoa(fixedFavorites));
    quickEmoteMenu.favoriteEmotes = JSON.parse(fixedFavorites);
    quickEmoteMenu.updateFavorites();
};

EvenBetterDiscord.prototype.stop = function() {
    this.removeEBDFiles();
    this.loadEmotes(this.defaultEmotesFile);
};

EvenBetterDiscord.prototype.removeEBDFiles = function() {
    fs.stat(this.preferencesFile, (err, stats) => {
        if (err) { return; }

        fs.unlink(this.preferencesFile);
    });

    fs.stat(this.emotesFile, (err, stats) => {
        if (err) { return; }

        fs.unlink(this.emotesFile);
    });
};

EvenBetterDiscord.prototype.load = function() {};
EvenBetterDiscord.prototype.unload = function() {};
EvenBetterDiscord.prototype.onMessage = function() {};
EvenBetterDiscord.prototype.onSwitch = function() {};

EvenBetterDiscord.prototype.getName = function() {
    return `EvenBetterDiscord`;
};

EvenBetterDiscord.prototype.getDescription = function() {
    return `Loads FFZ emotes from alternate repository`;
};

EvenBetterDiscord.prototype.getVersion = function() {
    return `1.1.7`;
};

EvenBetterDiscord.prototype.getAuthor = function() {
    return `BlazingSky`;
};

/* @end @*/
