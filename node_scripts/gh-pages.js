#!/usr/bin/env node

/***************************************************************************************

 a modified version of the aframe (https://github.com/aframevr/aframe) gh-pages script

***************************************************************************************/


/**
 * Fancy script to deploy to GitHub Pages
 * ======================================
 *
 * Sample usage
 * ------------
 *
 * % node ./scripts/gh-pages
 * gh-pages -d dist -r git@github.com:aframevr/aframe.git
 *
 * % node ./scripts/gh-pages cvan
 * gh-pages -d dist -r git@github.com:cvan/aframe.git
 *
 * % node ./scripts/gh-pages git@github.com:dmarcos/aframe.git
 * gh-pages -d dist -r git@github.com:dmarcos/aframe.git
 *
 */

var ghpages = require('gh-pages');
var open = require('open');
var path = require('path');

var repo = {
  username: 'jzitelli',
  name: 'poolvr'
};

var arg = process.argv[2];
if (arg) {
  if (arg.indexOf(':') === -1) {
    repo.username = arg;
  } else {
    repo.url = arg;
    var usernameMatches = arg.match(':(.+)/');
    if (usernameMatches) {
      repo.username = usernameMatches[1];
    }
  }
}

if (!repo.url) {
  repo.url = 'git@github.com:' + repo.username + '/' + repo.name + '.git';
}

repo.ghPagesUrl = 'https://' + repo.username + '.github.io/' + repo.name + '/';

console.log('Publishing to', repo.url);

function getCacheDir (repoUsername, repoName) {
  repoUsername = (repoUsername || '').toLowerCase().trim();
  repoName = (repoName || '').toLowerCase().trim();
  var pathAbsolute = path.resolve(
    __dirname,
    '..',
    '.cache', 'gh-pages', repoUsername, repoName
  );
  return path.relative(process.cwd(), pathAbsolute);
}

ghpages.publish(path.join(process.cwd(), 'dist'), {
  //clone: getCacheDir(repo.username, repo.name),
  repo: repo.url,
  //dotfiles: true,
  add: true,
  logger: function (message) {
    console.log(message);
  }
}, function (error) {
  if (error) {
    console.log('Error ' + error);
    return;
  }
  console.log('Published');
  console.log(repo.ghPagesUrl);
  open(repo.ghPagesUrl);
});
