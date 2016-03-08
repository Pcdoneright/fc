///<reference path="../../typings/app.d.ts" />
///<reference path="../../app/services/DataEntrySvc.ts" />
///<reference path="../../app/services/agGridHelperSvc.ts" />

class divisionmaint {
    dESrvc:app.IDataEntrySrvc;
    divisions:app.IDataStore;
    submajors:app.IDataStore;
    subminors:app.IDataStore;
    // divisionsGrid: any = {settings: {}, api: {}};
    divisionsGrid: any;
    submajorsGrid: any;
    subminorsGrid: any;
    gH:number;

    static $inject = ['$scope', '$filter', '$timeout', '$window', '$mdDialog', 'DataSvc', 'CompanySvc', 'toastr', 'DataEntrySvc', 'agGridHelperSvc', 'dxHelperSvc'];
    constructor(private $scope, private $filter:ng.IFilterService, private $timeout:ng.ITimeoutService, private $window:ng.IWindowService, private $mdDialog, private DataSvc, private CompanySvc, private toastr:toastr.IToastrService, private DataEntrySvc, private agH:app.IagGridHelperSvc, private dxH:app.IdxHelperSvc) {
        // New Data Entry Service Instance
        this.dESrvc = DataEntrySvc.Instance();

        // Data Stores, Unique Keys, updatable, validate fields
        this.divisions = this.dESrvc.newDataStore('divisions', ['fdid'], true, ['fdid', 'fdescription']);
        this.submajors = this.dESrvc.newDataStore('submajors', ['fdid', 'fsmjid'], true, ['fdid', 'fsmjid', 'fdescription']);
        this.subminors = this.dESrvc.newDataStore('subminors', ['fdid', 'fsmjid', 'fsmnid'], true, ['fdid', 'fsmjid', 'fsmnid', 'fdescription']);

        // Get Data
        DataSvc.serverDataGet('api/DivisionMaint/GetDivision').then((dataResponse) => {
            this.divisions.loadData(dataResponse.divisions);
            this.submajors.loadData(dataResponse.submajors);
            this.subminors.loadData(dataResponse.subminors);

            // this.divisionsGrid.settings.source = this.divisions.items;
            this.divisionsGrid.api.setRowData(this.divisions.items);
        });

        angular.element($window).bind('resize', this.onResizeWindow); //Capture resize event
        this.onResizeWindow(); // Execute at start
        this.initGrids();
    }

    update(event){
        if (!this.dESrvc.checkForChanges()) return;

        var msg = this.dESrvc.validate();
        if (msg != '') {
            this.showValidateMsg(msg);
            return;
        }

        this.CompanySvc.ofSetHourGlass(true);
        this.dESrvc.update('api/DivisionMaint/Postupdate').finally(() => {this.CompanySvc.ofSetHourGlass(false);}); // Send to Server
    }

    // Parse Error Msg
    showValidateMsg(msg) {
        var fieldmsg = '', tablemsg = '';

        switch (msg.table) {
            case 'divisions':
                tablemsg = 'DIVISIONS';
                switch (msg.field) {
                    case 'fdid':
                        fieldmsg = "ID";
                        break;
                    case 'fdescription':
                        fieldmsg = "DESCRIPTION";
                        break;
                }
                break;
            case 'submajors':
                tablemsg = 'SUB-DIVISIONS';
                switch (msg.field) {
                    case 'fsmjid':
                        fieldmsg = "ID";
                        break;
                    case 'fdescription':
                        fieldmsg = "DESCRIPTION";
                        break;
                }
                break;
            case 'subminors':
                tablemsg = 'MINOR';
                switch (msg.field) {
                    case 'fsmnid':
                        fieldmsg = "ID";
                        break;
                    case 'fdescription':
                        fieldmsg = "DESCRIPTION";
                        break;
                }
                break;
        }

        this.toastr.error(fieldmsg + ' value missing in ' + tablemsg);
    }

    divisionAdd(event) {
        this.CompanySvc.inputTextDialog('Enter DIVISION ID:', '', event).then((value)=> {
            if (!value) return;
            if (this.$filter('filter')(this.divisions.items, {fdid: value}, true).length > 0) {
                this.toastr.info('ID Already Exists.');
                return;
            }

            this.divisions.addRow({
                fdid: value
            });
            this.divisionsGrid.api.setRowData(this.divisions.items);
            this.agH.gridScrollToLastRow(this.divisionsGrid, 1);
        });
    }

    divisionRemove(event) {
        if (this.divisionsGrid.api.getSelectedRows().length == 0) return; // check for valid row
        if (this.submajorsGrid.rowData.length > 0) {
            this.toastr.info('Must remove all SUB-DIVISIONS.');
            return;
        }

        this.divisions.removeRow(event, this.divisionsGrid.api.getSelectedRows()[0]).then(()=>{
            this.divisionsGrid.api.setRowData(this.divisions.items);
        });
    }

    submajorAdd(event) {
        if (this.divisionsGrid.api.getSelectedRows().length == 0) return;
        var fdid = this.divisionsGrid.api.getSelectedRows()[0].fdid;

        this.CompanySvc.inputTextDialog('Enter SUB-DIVISION ID:', '', event).then((value)=> {
            if (!value) return;
            if (this.$filter('filter')(this.submajors.items, {fdid: fdid, fsmjid: value}, true).length > 0) {
                this.toastr.info('ID Already Exists.');
                return;
            }

            this.submajors.addRow({
                fdid: fdid,
                fsmjid: value,
            });
            this.submajorsGrid.api.setRowData(this.filterRows('submajors'));
            this.agH.gridScrollToLastRow(this.submajorsGrid, 1);
        });
    }

    submajorRemove(event) {
        if (this.submajorsGrid.api.getSelectedRows().length == 0) return; // check for valid row
        if (this.subminorsGrid.rowData.length > 0) {
            this.toastr.info('Must remove all MINOR.');
            return;
        }

        this.submajors.removeRow(event, this.submajorsGrid.api.getSelectedRows()[0]).then(()=>{
            this.submajorsGrid.api.setRowData(this.filterRows('submajors'));
        });
    }

    subminorAdd(event) {
        if (this.submajorsGrid.api.getSelectedRows().length == 0) return;
        var fdid = this.submajorsGrid.api.getSelectedRows()[0].fdid;
        var fsmjid = this.submajorsGrid.api.getSelectedRows()[0].fsmjid;

        this.CompanySvc.inputTextDialog('Enter MINOR ID:', '', event).then((value)=> {
            if (!value) return;
            if (this.$filter('filter')(this.subminors.items, {fdid: fdid, fsmjid: fsmjid, fsmnid: value}, true).length > 0) {
                this.toastr.info('ID Already Exists.');
                return;
            }

            this.subminors.addRow({
                fdid: fdid,
                fsmjid: fsmjid,
                fsmnid: value,
            });
            this.subminorsGrid.api.setRowData(this.filterRows('subminors'));
            this.agH.gridScrollToLastRow(this.subminorsGrid, 1);
        });
    }

    subminorRemove(event) {
        if (this.subminorsGrid.api.getSelectedRows().length == 0) return; // check for valid row

        this.subminors.removeRow(event, this.subminorsGrid.api.getSelectedRows()[0]).then(()=>{
            this.subminorsGrid.api.setRowData(this.filterRows('subminors'));
        });
    }

    // filterRows(id:string) {
    //     return '';
    //
    //     if (id == 'submajors') {
    //         //return this.$filter('filter')(this.submajors, {fdid: (this.divisionsGrid.gridApi.getSelectedRowsData()[0].fdid == "") ? "-1" : this.divisionsGrid.gridApi.getSelectedRowsData()[0].fdid}, true);
    //         return 'vm.submajors.items | filter: {fdid: vm.divisionsGrid.gridApi.getSelectedRowsData()[0].fdid || "-1"} : true';
    //     }
    //     return 'vm.subminors.items | filter: {fdid: vm.submajorsGrid.gridApi.getSelectedRowsData()[0].fdid || "-1", fsmjid: vm.submajorsGrid.gridApi.getSelectedRowsData()[0].fsmjid || "-1"} : true';
    // }

    filterRows(id:string) {
        if (id == 'submajors') {
            if (this.divisionsGrid.api.getSelectedRows().length == 0) return [];
            return this.$filter('filter')(this.submajors.items, {fdid: this.divisionsGrid.api.getSelectedRows()[0].fdid}, true);
        }

        if (this.submajorsGrid.api.getSelectedRows().length == 0) return [];
        return this.$filter('filter')(this.subminors.items, {fdid: this.submajorsGrid.api.getSelectedRows()[0].fdid, fsmjid: this.submajorsGrid.api.getSelectedRows()[0].fsmjid}, true);
    }

    // Resize gridlist to fill window
    onResizeWindow = () => {
        this.$timeout(() => {
            this.gH = this.$window.innerHeight - 90;
        }, 100);
    };

    // Initialize Grid presentation (s/b on html)
    initGrids() {
        // jq
        // this.divisionsGrid.settings = {
        //     altrows: true,
        //     editable: true,
        //     selectionmode: 'singlerow',
        //     // height: '100%',
        //     //source: this.divisions.items,
        //     // enableSorting: false,
        //     // singleClickEdit: true,
        //     columns: [
        //         {dataField: "fdid", text: "ID", width: 50},
        //         {dataField: "fdescription", text: "Description", width: 350, editable: true}
        //     ]
        // };

        //kendo-grid
        // this.divisionsGrid = {
        //     editable: 'incell',
        //     selectable: 'row',
        //     resizable: true,
        //     edit: function(e) {
        //         var fieldName = e.container.find("input").attr("name");
        //         if (fieldName == 'fdid') this.closeCell(); // prevent editing
        //     },
        //     columns: [
        //         {field: "fdid", title: "ID", width: 50},
        //         {field: "fdescription", title: "Description", width: '100%', editable: true}
        //     ]
        // };

        // agGrid
        this.divisionsGrid = {
            enableSorting: false,
            singleClickEdit: true,
            onCellFocused: (params) => {
                this.divisionsGrid.api.selectIndex(params.rowIndex);
                this.submajorsGrid.api.setRowData(this.filterRows('submajors'));
                this.subminorsGrid.api.setRowData(this.filterRows('subminors'));

                // var cell = this.agH.gridOnCellFocusedGetElement(this.divisionsGrid, params);
                // this.$timeout(() => {
                //     console.log('cell', cell.childNodes[0])
                //     cell.childNodes[0].setSelectionRange(5, 5);
                // }, 100);
             },
            // onCellValueChanged: (params) => {
            //     if (params.oldValue !== params.newValue) {
            //         console.log('cellValueChanged', params);
            //     }
            // },
            columnDefs: [
                {field: "fdid", headerName: "ID", width: 50},
                {field: "fdescription", headerName: "Description", width: 350, editable: true, cellRenderer: function (parms) {
                    // console.log(parms);
                    return parms.value;
                }}
            ]
        };
        this.agH.gridInit(this.divisionsGrid); // Set Default Values

        // dxDatagrid
        // this.divisionsGrid = {
        //     bindingOptions: {dataSource: 'vm.divisions.items', height: 'vm.gH'},
        //     sorting: {mode: 'none'},
        //     editing: {editMode: 'cell', editEnabled: true},
        //     onEditingStart: (info) => { this.dxH.gridSelectRow(info); },
        //     columns: [
        //         {dataField: "fdid", caption: "ID", width: 50},
        //         {dataField: "fdescription", caption: "Description", xidth: 250, allowEditing: true}
        //     ]
        // };
        // this.dxH.gridInit(this.divisionsGrid); // Set Default Values

        // agGrid
        this.submajorsGrid = {
            enableSorting: false,
            singleClickEdit: true,
            onCellFocused: (params) => {
                this.submajorsGrid.api.selectIndex(params.rowIndex);
                this.subminorsGrid.api.setRowData(this.filterRows('subminors'));
            },
            // onCellValueChanged: (params) => {
            //     if (params.oldValue !== params.newValue) {
            //         console.log('cellValueChanged', params);
            //     }
            // },
            columnDefs: [
                {field: "fsmjid", headerName: "ID", width: 50},
                {field: "fdescription", headerName: "Description", width: 350, editable: true}
            ]
        };
        this.agH.gridInit(this.submajorsGrid); // Set Default Values

        // // dxDatagrid
        // this.submajorsGrid = {
        //     bindingOptions: {dataSource: this.filterRows('submajors'), height: 'vm.gH'},
        //     sorting: {mode: 'none'},
        //     editing: {editMode: 'cell', editEnabled: true},
        //     onEditingStart: (info) => { this.dxH.gridSelectRow(info); },
        //     columns: [
        //         {dataField: "fsmjid", caption: "ID", width: 50},
        //         {dataField: "fdescription", caption: "Description", xidth: 250, allowEditing: true}
        //     ]
        // };
        // this.dxH.gridInit(this.submajorsGrid); // Set Default Values

        // agGrid
        this.subminorsGrid = {
            enableSorting: false,
            singleClickEdit: true,
            // onCellValueChanged: (params) => {
            //     if (params.oldValue !== params.newValue) {
            //         console.log('cellValueChanged', params);
            //     }
            // },
            columnDefs: [
                {field: "fsmnid", headerName: "ID", width: 50},
                {field: "fdescription", headerName: "Description", width: 350, editable: true}
            ]
        };
        this.agH.gridInit(this.subminorsGrid); // Set Default Values

        // // dxDatagrid
        // this.subminorsGrid = {
        //     bindingOptions: {dataSource: this.filterRows('subminors'), height: 'vm.gH'},
        //     sorting: {mode: 'none'},
        //     editing: {editMode: 'cell', editEnabled: true},
        //     onEditingStart: (info) => { this.dxH.gridSelectRow(info); },
        //     columns: [
        //         {dataField: "fsmnid", caption: "ID", width: 50},
        //         {dataField: "fdescription", caption: "Description", xidth: 250, allowEditing: true}
        //     ]
        // };
        // this.dxH.gridInit(this.subminorsGrid); // Set Default Values
    }
}

// Register
angular.module('app').controller('divisionmaint', divisionmaint);