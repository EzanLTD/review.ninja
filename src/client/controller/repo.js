// *****************************************************
// Repo Controller
//
// tmpl: repo/repo.html
// path: /:user/:repo
// resolve: repo
// *****************************************************

module.controller('RepoCtrl', ['$scope', '$stateParams', '$modal', '$timeout', '$HUB', '$RPC', 'repo', 'socket', 'Pull',
    function($scope, $stateParams, $modal, $timeout, $HUB, $RPC, repo, socket, Pull) {

        // get the repo
        $scope.repo = repo;

        // for the authors
        $scope.authors = {};
        $scope.author = null;

        // set the default state
        $scope.type = 'open';

        //
        // Helper functions
        //

        var setAuthor = function(pull) {
            var author = pull.user.login;
            $scope.authors[author] = $scope.authors[author] || {};
            $scope.authors[author][pull.state] = true;
            $scope.authors[author].author = author;
        };

        // get the open pull requests
        $scope.open = $HUB.wrap('pullRequests', 'getAll', {
            user: $stateParams.user,
            repo: $stateParams.repo,
            state: 'open',
            per_page: 10
        }, function(err, res) {
            if(!err) {
                res.affix.forEach(function(pull) {
                    pull = Pull.milestone(pull) && Pull.stars(pull) && Pull.commentsCount(pull);
                    setAuthor(pull);
                });
            }
        });

        // get the closed pull requests
        $scope.closed = $HUB.wrap('pullRequests', 'getAll', {
            user: $stateParams.user,
            repo: $stateParams.repo,
            state: 'closed',
            per_page: 10
        }, function(err, res) {
            if(!err) {
                res.affix.forEach(function(pull) {
                    pull = Pull.milestone(pull) && Pull.stars(pull) && Pull.commentsCount(pull);
                    setAuthor(pull);
                });
            }
        });

        // get the collaborators
        $scope.collaborators = $HUB.wrap('repos', 'getCollaborators', {
            user: $stateParams.user,
            repo: $stateParams.repo
        });

        //
        // Websockets
        //

        socket.on($stateParams.user + ':' + $stateParams.repo + ':' + 'pull_request', function(args) {
            if(args.action === 'opened') {
                $HUB.wrap('pullRequests', 'get', {
                    user: $stateParams.user,
                    repo: $stateParams.repo,
                    number: args.number
                }, function(err, pull) {
                    if(!err) {
                        pull = Pull.milestone(pull.value) && Pull.stars(pull.value) && Pull.commentsCount(pull.value);
                        setAuthor(pull);
                        $scope.open.value.unshift(pull);
                    }
                });
            }
        });

        //
        // Actions
        //

        $scope.badge = function() {
            var modal = $modal.open({
                templateUrl: '/modals/templates/badge.html',
                controller: 'BadgeCtrl'
            });
        };

        $scope.invite = function(collaborator) {
            collaborator.invite = $RPC.call('invitation', 'invite', {
                user: $stateParams.user,
                repo: $stateParams.repo,
                invitee: collaborator.login
            });
        };

        //
        // UI text
        //

        $scope.getStarUsers = function(pull) {
            if(pull.stars && pull.stars.length) {
                return pull.stars.slice(0, 3).map(function(star) {
                    return star.name;
                }).join(', ') + (pull.stars.length > 3 ? ' and ' + (pull.stars.length - 3) + ' others starred' : ' starred');
            }
            return 'No stars';
        };
    }
]);
