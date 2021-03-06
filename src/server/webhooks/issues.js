// models
var User = require('mongoose').model('User');
var Milestone = require('mongoose').model('Milestone');

//services
var url = require('../services/url');
var github = require('../services/github');
var status = require('../services/status');
var keenio = require('../services/keenio');
var pullRequest = require('../services/pullRequest');
var notification = require('../services/notification');

//////////////////////////////////////////////////////////////////////////////////////////////
// Github Issue Webhook Handler
//////////////////////////////////////////////////////////////////////////////////////////////

module.exports = function(req, res) {

    //
    // Helper functions
    //

    function getPull(user, repo, number, token, done) {
        github.call({
            obj: 'pullRequests',
            fun: 'get',
            arg: {
                user: user,
                repo: repo,
                number: number
            },
            token: token
        }, done);
    }

    function getMilestone(user, repo, number, token, done) {
        github.call({
            obj: 'issues',
            fun: 'getMilestone',
            arg: {
                user: user,
                repo: repo,
                number: number
            },
            token: token
        }, done);
    }

    //
    // Webhook handler
    //

    var user = req.args.repository.owner.login;
    var repo = req.args.repository.name;
    var issue = req.args.issue.id;
    var sender = req.args.sender;
    var mile_uuid = req.args.issue.milestone.id;
    var repo_uuid = req.args.repository.id;

    User.findOne({ _id: req.params.id }, function(err, ninja) {

        if(err || !ninja) {
            return res.status(404).send('User not found');
        }

        if(!req.args.issue.milestone) {
            return res.send('Issue has no milestone');
        }

        Milestone.findOne({
            id: mile_uuid,
            repo: repo_uuid
        }, function(err, mile) {

            if(err || !mile) {
                return res.send('Milestone not found');
            }

            // log to keenio
            keenio.addEvent('issues:' + req.args.action, {
                user: sender.id,
                repo: repo_uuid,
                name: sender.login,
                pull: mile.pull,
                mile: mile.number,
                issue: issue
            });

            var actions = {
                opened: function() {

                    // update status and send an email when issue is opened
                    getPull(user, repo, mile.pull, ninja.token, function(err, pull) {
                        if(!err) {
                            status.update({
                                user: user,
                                repo: repo,
                                repo_uuid: repo_uuid,
                                sha: pull.head.sha,
                                number: pull.number,
                                token: ninja.token
                            });

                            notification.sendmail('new_issue', user, repo, repo_uuid, ninja.token, mile.pull, {
                                user: user,
                                repo: repo,
                                number: mile.pull,
                                issue: issue,
                                sender: sender,
                                settings: url.reviewSettings(user, repo),
                                url: url.reviewPullRequest(user, repo, mile.pull)
                            });
                        }
                    });
                },

                closed: function() {

                    // send a notification if all issues are closed
                    getMilestone(user, repo, mile.number, ninja.token, function(err, githubMile) {
                        if(!err && !githubMile.open_issues) {
                            notification.sendmail('closed_issue', user, repo, repo_uuid, ninja.token, mile.pull, {
                                user: user,
                                repo: repo,
                                number: mile.pull,
                                issue: issue,
                                sender: sender,
                                settings: url.reviewSettings(user, repo),
                                url: url.reviewPullRequest(user, repo, mile.pull)
                            });
                        }
                    });

                    // update the status
                    getPull(user, repo, mile.pull, ninja.token, function(err, pull) {
                        if(!err) {
                            status.update({
                                user: user,
                                repo: repo,
                                repo_uuid: repo_uuid,
                                sha: pull.head.sha,
                                number: pull.number,
                                token: ninja.token
                            });
                        }
                    });
                },

                reopened: function() {

                    // update status if pull request is not merged
                    getPull(user, repo, mile.pull, ninja.token, function(err, pull) {
                        if(!err && !pull.merged) {
                            status.update({
                                user: user,
                                repo: repo,
                                repo_uuid: repo_uuid,
                                sha: pull.head.sha,
                                number: pull.number,
                                token: ninja.token
                            });
                        }
                    });
                }
            };

            if(actions[req.args.action]) {
                actions[req.args.action]();
            }

            res.end();
        });
    });
};
