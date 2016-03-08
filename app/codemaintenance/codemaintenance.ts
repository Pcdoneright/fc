///<reference path="../../typings/app.d.ts" />
///<reference path="../../app/services/DataEntrySvc.ts" />
///<reference path="../../app/services/agGridHelperSvc.ts" />

class codemaintenance {
    g1H: number;
    g2H: number;
    fidToAdd: string;

    dESrvc: app.IDataEntrySrvc;
    codedetail: app.IDataStore;
    codemasterGrid: any;
    codedetailGrid: any;

    static $inject = ['$scope', '$timeout', '$window', '$filter', '$mdDialog', 'DataSvc', 'CompanySvc', 'toastr', 'DataEntrySvc', 'agGridHelperSvc'];
    constructor(private $scope, private $timeout:ng.ITimeoutService, private $window:ng.IWindowService, private $filter, private $mdDialog, private DataSvc, private CompanySvc, private toastr:toastr.IToastrService, private DataEntrySvc, private agH:app.IagGridHelperSvc) {

        // New Data Entry Service Instance
        this.dESrvc = DataEntrySvc.Instance();

        // Data Stores, Unique Keys, updatable, validate fields
        this.codedetail = this.dESrvc.newDataStore('code_detail', ['fgroupid', 'fid'], true, ['fid']);

        // Get Customer Terms for DropDown
        DataSvc.serverDataGet('api/CodeMaint/GetCode').then((dataResponse) => {
            this.codemasterGrid.api.setRowData(dataResponse.code_master);
            this.codedetail.loadData(dataResponse.code_detail);
        });

        angular.element($window).bind('resize', this.onResizeWindow); //Capture resize event
        this.onResizeWindow(); // Execute at start
        this.initGrids();
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
        this.dESrvc.update('api/CodeMaint/Postupdate').finally(() => { this.CompanySvc.ofSetHourGlass(false); });

    }

    // Parse Error Msg
    showValidateMsg(msg) {
        var fieldmsg = '', tablemsg = '';

        tablemsg = 'DETAILS';
        switch (msg.field) {
            case 'fid':
                fieldmsg = "ID";
                break;
        }

        this.toastr.error(fieldmsg + ' value missing in ' + tablemsg);
    }

    codeAdd(event) {
        if (this.codemasterGrid.api.getSelectedRows().length == 0) return;
        var fgroupid = this.codemasterGrid.api.getSelectedRows()[0].fgroupid;

        this.CompanySvc.inputTextDialog('Enter DETAIL ID:', '', event).then((value)=> {
            if (!value) return;
            if (this.$filter('filter')(this.codedetail.items, {fgroupid: fgroupid, fid: value}, true).length > 0) {
                this.toastr.info('ID Already Exists.');
                return;
            }

            this.codedetail.addRow({
                fgroupid: fgroupid,
                fid: value
            });
            this.codedetailGrid.api.setRowData(this.filterRows());
            this.agH.gridScrollToLastRow(this.codedetailGrid, 1);
        });
    }

    codeRemove(event) {
        if (this.codedetailGrid.api.getSelectedRows().length == 0) return; // check for valid row
        this.codedetail.removeRow(event, this.codedetailGrid.api.getSelectedRows()[0]).then(()=> {
            this.codedetailGrid.api.setRowData(this.filterRows());
        });
    }

    filterRows() {
        return this.$filter('filter')(this.codedetail.items, {fgroupid: this.codemasterGrid.api.getSelectedRows()[0].fgroupid}, true);
    }

    // Resize gridlist to fill window
    onResizeWindow = () => {
        this.$timeout(() => {
            this.g1H = angular.element('#p1').height() - 45;
            this.g2H = angular.element('#p2').height() - 45;
        }, 100);
    };

    // Initialize Grid
    initGrids() {
        // agGrid
        this.codemasterGrid = {
            enableSorting: false,
            onCellFocused: (params) => {
                this.codemasterGrid.api.selectIndex(params.rowIndex);
                this.codedetailGrid.api.setRowData(this.filterRows());
            },
            columnDefs: [
                {field: "fgroupid", headerName: "Group", width: 150},
                {field: "fdescription", headerName: "Description", width: 300}
            ]
        };
        this.agH.gridInit(this.codemasterGrid); // Set Default Values

        // ag-grid
        this.codedetailGrid = {
            enableSorting: false,
            singleClickEdit: true,
            columnDefs: [
                {field: "fid", headerName: "ID", width: 200},
                {field: "fdescription", headerName: "Description", width: 250, editable: true},
                {field: "fopt1", headerName: "Option 1", width: 150, editable: true},
                {field: "fopt2", headerName: "Option 2", width: 150, editable: true},
                {field: "forder", headerName: "Sequence", width: 100, editable: true},

            ]
        };
        this.agH.gridInit(this.codedetailGrid); // Set Default Values
    }
}

// Must be done after class is declared for it to work
angular.module('app').controller('codemaintenance', codemaintenance);