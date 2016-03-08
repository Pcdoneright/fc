///<reference path="../typings/app.d.ts" />

(function () {
    'use strict';

    agGrid.initialiseAgGridWithAngular1(angular); // V3.3.3 required.

    angular.module('app', ['ngMaterial', 'ngMessages', 'ngRoute', 'toastr', 'agGrid', 'dx', 'bgDirectives']);
    angular.module('app').config(['$routeProvider', '$locationProvider', 'toastrConfig', function ($routeProvider, $locationProvider, toastrConfig) {
        $routeProvider.when('/', {
                templateUrl: "app/company/login/login.html"
                //templateUrl: "app/test/test.html"

                //resolve: resolveController('/app/company/login/login.js')
                //controller: 'myController'
            })
            .when('/mainmenu', {
                templateUrl: "app/company/mainmenu/mainmenu.html"
                //controller: 'mainMenuCtrl'
            });

        $routeProvider.otherwise({redirectTo: '/'});
        //$locationProvider.html5Mode(true);

        angular.extend(toastrConfig, {
            positionClass: 'toast-bottom-right'
        });
    }]);

    // Initialize Global Values
    angular.module('app').run(["$rootScope", function ($rootScope) {
        //$.material.init(); // Bootstrap Material Design

        $rootScope.companyVersion = 'V0.2.0';
        $rootScope.debugwebserver = '';
        //$rootScope.debugwebserver = 'http://localhost/ACAJS/'; // Debug Only
    }]);
})();