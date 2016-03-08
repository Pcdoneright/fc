///<reference path="../../../typings/app.d.ts" />
///<reference path="../../../app/services/DataEntrySvc.ts" />
///<reference path="../../../app/services/dxHelperSvc.ts" />

class programrights {
    groupsGrid: any;
    groups_accessGrid: any;
    programsGrid: any;
    programsGridData: any[];
    dESrvc:app.IDataEntrySrvc;
    groups:app.IDataStore;
    groups_access:app.IDataStore;
    g1H: number;
    g2H: number;

    // Must be done for minified to work
    static $inject = ['$q', '$filter', '$timeout', '$window', '$mdDialog', 'DataSvc', 'CompanySvc', 'toastr', 'DataEntrySvc', 'dxHelperSvc'];
    constructor($q:ng.IQService, private $filter:ng.IFilterService, private $timeout:ng.ITimeoutService, private $window:ng.IWindowService, private $mdDialog, private DataSvc, private CompanySvc, private toastr:toastr.IToastrService, DataEntrySvc, private dxH:app.IdxHelperSvc) {
        this.dESrvc = DataEntrySvc.Instance();
        this.dESrvc.initCodeTable();
        // Data Stores, Unique Keys, updatable, validate fields
        this.groups = this.dESrvc.newDataStore('groups', ['fgroupid'], true, ['fname']);
        this.groups_access = this.dESrvc.newDataStore('groups_access', ['fgroupid', 'fprogid'], true, ['fgroupid', 'fprogid']);

        angular.element($window).bind('resize', this.onResizeWindow); //Capture resize event
        this.onResizeWindow(); // Execute at start
        this.initGrids();

        // Get Data
        DataSvc.serverDataGet('api/GroupsMaint/GetGroups').then((dataResponse) => {
            this.groups.loadData(dataResponse.groups);
            this.groups_access.loadData(dataResponse.groups_access);
        });

        // Get Programs
        DataSvc.serverDataGet('api/GroupsMaint/GetPrograms').then((dataResponse) => {
            this.programsGridData = dataResponse;
        });
    }

    update() {
        if (!this.dESrvc.checkForChanges()) return;

        var msg = this.dESrvc.validate();
        if (msg !== '') {
            this.showValidateMsg(msg);
            return;
        }

        this.CompanySvc.ofSetHourGlass(true);

        // Send to Server
        this.dESrvc.update('api/GroupsMaint/Postupdate').then((dataResponse) => {
            this.CompanySvc.ofSetHourGlass(false);
        }, (ErrorMsg) => {
            this.CompanySvc.ofSetHourGlass(false);
        });
    }

    // Parse Error Msg
    showValidateMsg(msg) {
        var fieldmsg = '', tablemsg = '';

        switch (msg.table) {
            case 'groups':
                tablemsg = 'DETAILS';
                switch (msg.field) {
                    case 'FNAME':
                        fieldmsg = 'NAME';
                        break;
                }
                break;
        }

        this.toastr.error(fieldmsg + ' value missing in ' + tablemsg);
    }

    groupsAdd() {
        this.groups.addRow({
            fgroupid: this.dESrvc.getMaxValue(this.groups.items, 'fgroupid') + 1
        });

        this.dxH.gridScrollToLastRow(this.groupsGrid, 1); // Scroll to new row, qty
    }

    groups_accessAdd() {
        if (this.groupsGrid.gridApi.getSelectedRowsData().length == 0) return;
        var fgroupid = this.groupsGrid.gridApi.getSelectedRowsData()[0].fgroupid;

        this.$mdDialog.show({
            targetEvent: event,
            locals: {parent: this},
            controller: angular.noop,
            controllerAs: 'c',
            bindToController: true,
            //templateUrl: 'app/templates/itemhistorylist.tmpl.html'
            template: '<md-dialog>' +
            '<md-content>' +
            '   <div layout="column" class="widget-grid panel-nobox" flex>' +
            '       <header>' +
            '           <div layout="row" flex layout-align="start center">' +
            '           <span>Program List</span>' +
            '           <span flex></span>' +
            '           <span>Rows: {{c.parent.programsGrid.gridApi.totalCount()}}</span>' +
            '           </div>' +
            '       </header>' +
            '       <div dx-data-grid="c.parent.programsGrid" class="mdx-datagrid" style="height: 300px"></div>' +
            '   </div>' +
            '</md-content>' +
            '<div class="md-actions">' +
            '   <md-button ng-click="c.parent.dESrvc.mdDialogCancel()">Cancel</md-button>' +
            '   <md-button ng-click="c.parent.dESrvc.mdDialogClose()">Continue</md-button>' +
            '</div>' +
            '</md-dialog>'
        }).then(() => {
            if (this.programsGrid.gridApi.getSelectedRowsData().length == 0) return; // nothing selected
            var rows = this.dxH.gridRows(this.groups_accessGrid);
            // exit if already exists
            if (this.$filter('filter')(rows, {fprogid: this.programsGrid.gridApi.getSelectedRowsData()[0].fprogid}, true).length > 0) return;

            this.groups_access.addRow({
                fgroupid: fgroupid,
                fprogid: this.programsGrid.gridApi.getSelectedRowsData()[0].fprogid,
                cfname: this.programsGrid.gridApi.getSelectedRowsData()[0].fname,
                fsequence: this.dESrvc.getMaxValue(rows, 'fsequence') + 1
            });

            this.dxH.gridScrollToLastRow(this.groups_accessGrid, 0); // Scroll to new row (always last)
        });
    }

    groups_accessRemove(event) {
        if (this.groups_accessGrid.gridApi.getSelectedRowsData().length == 0) return; // No selected row
        this.groups_access.removeRow(event, this.groups_accessGrid.gridApi.getSelectedRowsData()[0]);
    }

    groupsRemove(event) {
        if (this.groupsGrid.gridApi.getSelectedRowsData().length == 0) return; // No selected row
        this.groups.removeRow(event, this.groupsGrid.gridApi.getSelectedRowsData()[0]);
    }

    fsequenceArrange(pfprogid, pfsequence) {
        var rows = this.dxH.gridRows(this.groups_accessGrid);
        // Increment Equal or Greater Values
        for (var i = 0; i < rows.length; i++) {
            var obj = rows[i];
            if (obj.fsequence == null) continue; // Skip
            if (obj.fsequence >= pfsequence && obj.fprogid !== pfprogid) obj.fsequence ++; // Increment
        }
        // Get List Sorted and Reasign Sequence Starting with 1
        var nrows = this.$filter('orderBy')(rows, 'fsequence');
        var nseq = 0;
        for (var i = 0; i < nrows.length; i++) {
            var obj = nrows[i];
            if (obj.fsequence == null) continue; // Skip
            nseq ++;
            obj.fsequence = nseq;
        }
    }

    // Resize gridlist to fill window
    onResizeWindow = () => {
        this.$timeout(() => {
            this.g1H = angular.element('#p1').height() - 40;
            this.g2H = angular.element('#p2').height() - 40;
        }, 50);
    };

    initGrids() {
        // dxDataGrid
        this.groupsGrid = {
            bindingOptions: {dataSource: 'vm.groups.items', height: 'vm.g1H'},
            sorting: {mode: 'none'},
            editing: {editMode: 'cell', editEnabled: true},
            onEditorPrepared : (options) => {
                if (options.parentType === "dataRow" && options.dataField) {
                    // OnChange
                    options.editorElement[options.editorName]('instance').option('onValueChanged', (e) => {
                        options.row.data[options.dataField] = e.value; // Save all other fields
                    });

                    this.dxH.gridSelectText(options); // Select Text
                }
            },
            onEditingStart: (info) => {this.dxH.gridSelectRow(info);},
            columns: [
                {dataField: "fgroupid", caption: "ID", width: 55},
                {dataField: "fname", caption: "Name", width: 250, allowEditing: true}
            ]
        };
        this.dxH.gridInit(this.groupsGrid); // Set Default Values

        // dxDataGrid
        this.groups_accessGrid = {
            bindingOptions: {
                //dataSource: 'vm.groups_access.items | filter: {FGROUPID: (vm.groupsGrid.gridApi.getSelectedRowsData()[0].FGROUPID == undefined) ? -1 : vm.groupsGrid.gridApi.getSelectedRowsData()[0].FGROUPID} : true | orderBy: "fsequence"',
                dataSource: 'vm.groups_access.items | filter: {fgroupid: (vm.groupsGrid.gridApi.getSelectedRowsData()[0].fgroupid == undefined) ? -1 : vm.groupsGrid.gridApi.getSelectedRowsData()[0].fgroupid} : true',
                height: 'vm.g2H'},
            sorting: {mode: 'none'},
            editing: {editMode: 'cell', editEnabled: true},
            onEditingStart: (info) => { this.dxH.gridSelectRow(info);},
            // OnChange, Select Text
            onEditorPrepared : (options) => {
                if (options.parentType === "dataRow" && options.dataField) {
                    // OnChange
                    options.editorElement[options.editorName]('instance').option('onValueChanged', (e) => {
                        options.row.data.fsequence = this.CompanySvc.validNumber(e.value.toString()); // Convert to number
                        this.fsequenceArrange(options.row.data.fprogid, options.row.data.fsequence);
                        this.$timeout(() => {this.groups_accessGrid.gridApi.refresh();}, 0);
                    });

                    this.dxH.gridSelectText(options);
                }
            },
            columns: [
                {dataField: "fsequence", caption: "Sequence", width: 80, allowEditing: true},
                {dataField: "cfname", caption: "Program", width: 250}
            ]
        };
        this.dxH.gridInit(this.groups_accessGrid); // Set Default Values

        // dxDataGrid
        this.programsGrid = {
            bindingOptions: {dataSource: 'c.parent.programsGridData'},
            // sorting: {mode: 'none'},
            columns: [
                {dataField: "fname", caption: "Program", width: 300}
            ]
        };
        this.dxH.gridInit(this.programsGrid); // Set Default Values
    }
}

// Must be done after class is declared for it to work
angular.module('app').controller('programrights', programrights);
