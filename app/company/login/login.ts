///<reference path="../../../typings/app.d.ts" />
class myController {
    userid:string = "";
    password:string = "";

    static $inject = ['$rootScope', '$scope', 'CompanySvc', '$location', 'DataSvc', 'toastr'];

    constructor(private $rootScope, private $scope:ng.IScope, private CompanySvc, private $location, private DataSvc, private toastr:toastr.IToastrService) {
        // Get Company Name
        DataSvc.serverDataGet('api/Company/GetCompanyName').then((dataResponse) => {
            $rootScope.companyName = dataResponse;
        });
    }

    // Validate Login and Get Menu Data
    ofLogin() {
        this.CompanySvc.ofSetHourGlass(true);
        this.DataSvc.serverDataGet('api/Login/GetLogin', {
            userid: this.userid,
            pswd: this.password
        }).then((dataResponse) => {
            this.CompanySvc.ofSetHourGlass(false);
            if (dataResponse.success) {
                this.CompanySvc.ofSetMenu(dataResponse.data);
                this.CompanySvc.ofSetUser(dataResponse.user);
                this.$location.url('/mainmenu');
            }
            else
                this.toastr.error('Invalid User ID or Password.');
        });
    };
}

angular.module('app').controller('myController', myController);
