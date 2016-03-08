///<reference path="../../typings/app.d.ts" />
///<reference path="../../app/services/DataEntrySvc.ts" />
///<reference path="../../app/services/dxHelperSvc.ts" />

class userMaint {
    gHeight: number;
    dESrvc: app.IDataEntrySrvc;
    user: app.IDataStore;
    userGrid: any;
    groups: any[];

    static $inject = ['$scope', '$timeout', '$window', '$filter', '$mdDialog', 'DataSvc', 'CompanySvc', 'toastr', 'DataEntrySvc', 'dxHelperSvc', 'agGridHelperSvc', 'w2uiHelperSvc'];
    constructor(private $scope, private $timeout:ng.ITimeoutService, private $window:ng.IWindowService, private $filter, private $mdDialog, private DataSvc, private CompanySvc, private toastr:toastr.IToastrService, private DataEntrySvc, private dxH:app.IdxHelperSvc, private agH:app.IagGridHelperSvc, private w2uiH) {

        // New Data Entry Service Instance
        this.dESrvc = DataEntrySvc.Instance();

        // Data Stores, Unique Keys, updatable, validate fields
        this.user = this.dESrvc.newDataStore('user', ['fuid'], true, ['fuserid', 'fgroupid', 'fpassword', 'ffirst', 'flast']);

        angular.element($window).bind('resize', this.onResizeWindow); //Capture resize event
        this.onResizeWindow(); // Execute at start
        this.initGrids();

        // Get Groups (chain $q)
        DataSvc.serverDataGet('api/UserMaint/GetGroups').then((dataResponse) => {
            // this.setSelectionOptions = dataResponse;
            // this.userGrid.columnDefs[1].cellRenderer = this.customEditor;
            // this.userGrid.columns[1].lookup = {dataSource: dataResponse, displayExpr: 'fname', valueExpr: 'fgroupid'};
            this.groups = dataResponse;
            this.userGrid.columns[1].editable = { type: 'select', items: this.groups };
        }).then(() => {
            // After all columns assigned Get Users
            DataSvc.serverDataGet('api/UserMaint/Getlist').then((dataResponse) => {
                this.user.loadData(dataResponse);
                this.w2uiH.gridInit(this.userGrid); // Set Default Values & Prepare
                this.w2uiH.gridLoad(this.userGrid, this.user.items)
            });
        });
    }

    update() {
        if (!this.dESrvc.checkForChanges()) return;

        var msg = this.dESrvc.validate();
        if (msg != '') {
            this.showValidateMsg(msg);
            return;
        }

        this.CompanySvc.ofSetHourGlass(true);
        // Send to Server
        this.dESrvc.update('api/userMaint/Postupdate').then((dataResponse) => {
            this.CompanySvc.ofSetHourGlass(false);
        });

    }

    // Parse Error Msg
    showValidateMsg(msg) {
        var fieldmsg = '', tablemsg = '';

        switch (msg.table) {
            case 'user':
                tablemsg = 'USERS';
                switch (msg.field) {
                    case 'fuserid':
                        fieldmsg = "USER ID";
                        break;
                    case 'fpassword':
                        fieldmsg = "PASSWORD";
                        break;
                    case 'ffirst':
                        fieldmsg = "FIRST NAME";
                        break;
                    case 'flast':
                        fieldmsg = "LAST NAME";
                        break;
                    case 'fgroupid':
                        fieldmsg = "ACCESS GROUP";
                        break;
                    case 'flocation':
                        fieldmsg = "LOCATION";
                        break;
                }
                break;
        }

        this.toastr.error(fieldmsg + ' value missing in ' + tablemsg);
    }

    userAdd() {
        var rec = this.user.addRow({
            recid: this.dESrvc.getMaxValue(this.user.items, 'recid') + 1, // Needed by grid
            fuid: this.dESrvc.getMaxValue(this.user.items, 'fuid') + 1,
            factive: true,
            fisadmin: false
        });

        this.w2uiH.gridLoad(this.userGrid, this.user.items, false); // Load Data, no refresh
        this.w2uiH.gridScrollToLastRow(this.userGrid, 1, true); // Focus
    }

    // Resize gridlist to fill window
    onResizeWindow = () => {
        this.$timeout(() => {
            this.gHeight = this.$window.innerHeight - 85;
            this.w2uiH.gridResize(this.userGrid);
        }, 100);
    };

    test() {
        // this.userGrid.api.mergeChanges();
        // console.log(this.userGrid.api.records);

        // this.user.items[1].flast = 'Test Last';
        // this.userGrid.api.refresh();
    }

    // Initialize Grid presentation (s/b on html)
    initGrids() {
        //w2ui
        this.userGrid = {
            name: 'umgrid01',
            sortable: false,
            singleClickEdit: true,
            onChange: (event) => {
                // console.log('onchange', event.value_new);
                // console.log('onchange', event);
                this.$timeout(()=> { this.userGrid.api.mergeChanges() }); // Apply Changes
            },
            columns: [
                {field: "factive", caption: "Active", size: 70, editable: { type: 'checkbox' }},
                {field: "fgroupid", caption: "Access Group", size: 150, render: (record, index, col_index) => {
                    for (var p in this.groups) {
                        if (this.groups[p].id == this.userGrid.api.getCellValue(index, col_index)) {return this.groups[p].text;}
                    }
                    return '';
                }},
                {field: "fisadmin", caption: "Admin", size: 70, editable: { type: 'checkbox' }},
                {field: "fuserid", caption: "ID", size: 150, editable: { type: 'text' }},
                {field: "fpassword", caption: "Password", size: 150, render: () => {return '*******';}, editable: { type: 'text' }},
                {field: "ffirst", caption: "First Name", size: 200, editable: { type: 'text' }},
                {field: "flast", caption: "Last Name", size: 200, editable: { type: 'text' }},
            ]
        };
        //this.w2uiH.gridInit(this.userGrid); // Set Default Values

        // //ag-grid
        // this.userGrid = {
        //     enableSorting: false,
        //     singleClickEdit: true,
        //     angularCompileRows: true, // Needed for ng-model to work
        //     columnDefs: [
        //         {field: "factive", headerName: "Active", width: 70, cellRenderer: function(params)
        //             {return '<input type="checkbox" ng-model="data.factive"/>';}},
        //             // return '<input type="checkbox" ng-model="data.new_factive" ' + (params.data.factive ? 'checked' : '') + ' />';}},
        //         {field: "fgroupid", headerName: "Access Group", width: 150, Xeditable: true},
        //         {field: "fisadmin", headerName: "Admin", width: 70, cellRenderer: function(params)
        //             {return '<input type="checkbox" ng-model="data.fisadmin" />';}},
        //         {field: "fuserid", headerName: "ID", width: 150, editable: true},
        //         {field: "fpassword", headerName: "Password", width: 150, cellRenderer: () => {return '*******';}, editable: true},
        //         {field: "ffirst", headerName: "First Name", width: 200, editable: true},
        //         {field: "flast", headerName: "Last Name", width: 200, editable: true},
        //     ]
        // };
        // this.agH.gridInit(this.userGrid); // Set Default Values

        // //dxdatagrid
        // this.userGrid = {
        //     bindingOptions: {dataSource: 'vm.user.items', height: 'vm.gHeight'},
        //     sorting: { mode: 'none' },
        //     editing: {
        //         editMode: 'cell',
        //         editEnabled: true
        //     },
        //     onEditingStart: (info) => { this.dxH.gridSelectRow(info); },
        //     columns: [
        //         {dataField: "factive", caption: "Active", width: 70, dataType: 'boolean', allowEditing: true},
        //         {dataField: "fgroupid", caption: "Access Group", width: 150, allowEditing: true},
        //         {dataField: "fisadmin", caption: "Admin", width: 70, dataType: 'boolean', allowEditing: true},
        //         {dataField: "fuserid", caption: "ID", width: 150, allowEditing: true},
        //         {dataField: "fpassword", caption: "Password", width: 150, customizeText: (data) => {return '*******';}, allowEditing: true},
        //         {dataField: "ffirst", caption: "First Name", width: 200, allowEditing: true},
        //         {dataField: "flast", caption: "Last Name", width: 200, allowEditing: true},
        //         // {dataField: "flocation", caption: "Location", width: 200, allowEditing: true}
        //     ]
        // };
        // this.dxH.gridInit(this.userGrid); // Set Default Values
    }
}

// Must be done after class is declared for it to work
angular.module('app').controller('userMaint', userMaint);