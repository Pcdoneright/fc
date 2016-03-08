///<reference path="../../typings/app.d.ts" />
///<reference path="../../app/services/DataEntrySvc.ts" />

class contractormaint {
    selectedTab = 0;
    selectedTab02 = 0;
    g1H: number;
    g2H: number;

    dESrvc: app.IDataEntrySrvc;
    contractors: app.IDataStore;
    contractorcontacts: app.IDataStore;
    contractordivisions: app.IDataStore;
    contractorslog: app.IDataStore;

    contractorcontactsGrid: any;
    contractordivisionsGrid: any;
    contractorslogGrid: any;
    listGrid: any;
    divisions: any = [];
    submajors: any = [];
    subminors: any = [];
    lDivisions: any = [];
    lSubmajors: any = [];
    lSubminors: any = [];
    ctypes: any = [];
    cActions: any = [];
    fcid:number;
    fdid: string;
    fsmjid: string;
    fsmnid: string;

    static $inject = ['$scope', '$timeout', '$window', '$filter', '$mdDialog', 'DataSvc', 'CompanySvc', 'toastr', 'DataEntrySvc', 'agGridHelperSvc', 'w2uiHelperSvc'];

    constructor(private $scope, private $timeout:ng.ITimeoutService, private $window:ng.IWindowService, private $filter, private $mdDialog, private DataSvc, private CompanySvc, private toastr:toastr.IToastrService, private DataEntrySvc, private agH:app.IagGridHelperSvc, private w2uiH) {
        // New Data Entry Service Instance
        this.dESrvc = DataEntrySvc.Instance();
        this.dESrvc.initCodeTable().then((dataResponse) => {
            this.ctypes = $filter('filter')(dataResponse, {fgroupid: "CT"});
            this.ctypes.unshift({fid: null, fdescription: ''}); // Add first item null

            this.cActions = $filter('filter')(dataResponse, {fgroupid: "LA"});
            this.w2uiH.arrayToSelect(this.cActions, 'fid', 'fdescription'); // add id & text
            this.contractorslogGrid.columns[1].editable.items = this.cActions; // Set Grid Columns
        });

        // Data Stores, Unique Keys, updatable, validate fields
        this.contractors = this.dESrvc.newDataStore('contractors', ['fcid'], true, ['fname', 'fphone', 'faddress1']);
        this.contractorcontacts = this.dESrvc.newDataStore('contractorcontacts', ['fcid', 'fctid'], true, ['ffirst', 'flast', 'fphone']);
        this.contractordivisions = this.dESrvc.newDataStore('contractordivisions', ['fcid', 'fcdid'], true, ['fdid','fsmjid', 'fsmnid']);
        this.contractorslog = this.dESrvc.newDataStore('contractorslog', ['fcid', 'fclid'], true, ['fdate', 'faction']);

        angular.element($window).bind('resize', this.onResizeWindow); //Capture resize event
        this.onResizeWindow(); // Execute at start
        this.initGrids();

        DataSvc.serverDataGet('api/DivisionMaint/GetDivision').then((dataResponse) => {
            this.divisions = dataResponse.divisions;
            this.lDivisions = angular.copy(this.divisions);
            this.lDivisions.unshift({fdid:'A',cfdescription:"All"}); // Add first item
            this.fdid = 'A';

            this.submajors = dataResponse.submajors;
            this.lSubmajors.unshift({fdid:'A', fsmjid: 'A', cfdescription:"All"}); // Add first item
            this.fsmjid = 'A';

            this.subminors = dataResponse.subminors;
            this.lSubminors.unshift({fdid:'A', fsmjid: 'A', fsmnid: 'A', cfdescription:"All"}); // Add first item
            this.fsmnid = 'A';

            this.w2uiH.arrayToSelect(this.divisions, 'fdid', 'cfdescription'); // add id & text
            this.w2uiH.arrayToSelect(this.submajors, 'fsmjid', 'cfdescription'); // add id & text
            this.w2uiH.arrayToSelect(this.subminors, 'fsmnid', 'cfdescription'); // add id & text

            this.contractordivisionsGrid.columns[0].editable.items = this.divisions; // Set Grid Columns

            // Must be done after init
            $timeout(()=> {
                this.w2uiH.gridInit(this.contractorcontactsGrid);
                this.w2uiH.gridInit(this.contractordivisionsGrid);
                this.w2uiH.gridInit(this.contractorslogGrid);
            }, 400); // Set Default Values
        });

        // Get Data
    }

    createContractor() {
        this.dESrvc.pendingChangesContinue().then(() => {
            this.CompanySvc.ofSetHourGlass(true);
            this.contractors.loadData([]);
            this.contractorcontacts.loadData([]);
            this.contractordivisions.loadData([]);
            this.contractorslog.loadData([]);
            
            this.DataSvc.serverDataGet('api/Company/Getnextsequence', {seq: 'contractors'}).then((dataResponse) => {
                this.contractors.addRow({
                    fcid: dataResponse.data,
                    factive: true
                });
                // Clear Grids
                this.contractorcontactsGrid.api.clear();
                this.contractordivisionsGrid.api.clear();
                this.contractorslogGrid.api.clear();

                angular.element('#fname')[0].focus(); // Set focus
                
            }).finally(()=> {this.CompanySvc.ofSetHourGlass(false)});
        });
    }

    update() {
        if (!this.dESrvc.checkForChanges()) return;

        var msg = this.dESrvc.validate();
        if (msg != '') {
            this.toastr.error(this.showValidateMsg(msg));
            return;
        }

        this.contractors.items[0].ts = new Date();
        this.contractors.items[0].fby = this.CompanySvc.userInfo.fname;

        this.CompanySvc.ofSetHourGlass(true);
        // Send to Server
        this.dESrvc.update('api/ContractorMaint/Postupdate').finally(() => {this.CompanySvc.ofSetHourGlass(false)});
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

        return fieldmsg + ' value missing in ' + tablemsg;
    }

    // Valid Entry
    validEntry():boolean {
        return (this.contractors.items.length === 1);
    }

    retrieve(afcid) {
        if (!afcid) return;

        this.dESrvc.pendingChangesContinue().then(() => {
            this.CompanySvc.ofSetHourGlass(true);
            this.DataSvc.serverDataGet('api/ContractorMaint/GetContractor', {pfcid: afcid}).then((dataResponse) => {
                this.contractors.loadData(dataResponse.contractors);
                this.contractorcontacts.loadData(dataResponse.contractorcontacts);
                this.contractordivisions.loadData(dataResponse.contractordivisions);
                this.contractorslog.loadData(this.CompanySvc.convertDateToString(dataResponse.contractorslogs, 'fdate'));

                this.w2uiH.gridLoad(this.contractorcontactsGrid, this.contractorcontacts.items);
                this.w2uiH.gridLoad(this.contractordivisionsGrid, this.contractordivisions.items);
                this.w2uiH.gridLoad(this.contractorslogGrid, this.contractorslog.items);
            }).finally(()=> this.CompanySvc.ofSetHourGlass(false));
        });
    }

    onChangeDivision(aType) {
        switch (aType) {
            case 'division':
                this.lSubmajors = this.filterDivisions('submajor', {fdid: this.fdid});
                this.lSubmajors.unshift({fdid:'A', fsmjid: 'A', cfdescription:"All"}); // Add first item
                this.fsmjid = 'A';

                this.lSubminors = [{fdid:'A', fsmjid: 'A', fsmnid: 'A', cfdescription:"All"}]; // Add first item
                this.fsmnid = 'A';
                break;
            case 'submajor':
                this.lSubminors = this.filterDivisions('subminor', {fdid: this.fdid, fsmjid: this.fsmjid});
                this.lSubminors.unshift({fdid:'A', fsmjid: 'A', fsmnid: 'A', cfdescription:"All"}); // Add first item
                this.fsmnid = 'A';
                break;
        }
    }

    filterDivisions(aType, rec) {
        switch (aType) {
            case 'division':
                return this.$filter('filter')(this.divisions, {fdid: rec.fdid}, true); // Set Grid Columns
            case 'submajor':
                return this.$filter('filter')(this.submajors, {fdid: rec.fdid}, true); // Set Grid Columns
            case 'subminor':
                return this.$filter('filter')(this.subminors, {fdid: rec.fdid, fsmjid: rec.fsmjid}, true); // Set Grid Columns
        }
    }

    getDivisionsDescr(aType, filter) {
        switch (aType) {
            case 'division':
                return this.$filter('filter')(this.divisions, filter, true)[0].cfdescription;
            case 'submajor':
                return this.$filter('filter')(this.submajors, filter, true)[0].cfdescription;
            case 'subminor':
                return this.$filter('filter')(this.subminors, filter, true)[0].cfdescription;
        }
    }

    listGridRefresh() {
        // Get Data
        this.CompanySvc.ofSetHourGlass(true);
        this.DataSvc.serverDataGet('api/ContractorMaint/GetContactList', {pfdid: this.fdid, pfsmjid: this.fsmjid, pfsmnid: this.fsmnid}).then((dataResponse) => {
            this.listGrid.api.setRowData(dataResponse);
            if (dataResponse.length == 0) this.toastr.info('No Rows Were Found.');
        }).finally(()=> this.CompanySvc.ofSetHourGlass(false));
    }

    // Resize gridlist to fill window
    onResizeWindow = () => {
        this.$timeout(() => {
            this.g1H = this.$window.innerHeight - 140;
            this.g2H = this.$window.innerHeight - 450;

            this.w2uiH.gridResize(this.contractorcontactsGrid);
            this.w2uiH.gridResize(this.contractordivisionsGrid);
            this.w2uiH.gridResize(this.contractorslogGrid);
        }, 100);
    };

    contactsAdd() {
        if (!this.validEntry()) return;

        this.rowAdd(this.contractorcontactsGrid, this.contractorcontacts, {
            fctid: this.dESrvc.getMaxValue(this.contractorcontacts.items, 'fctid') + 1
        });
    }

    divisionsAdd() {
        if (!this.validEntry()) return;

        this.rowAdd(this.contractordivisionsGrid, this.contractordivisions, {
            fcdid: this.dESrvc.getMaxValue(this.contractordivisions.items, 'fcdid') + 1
        });
    }

    logsAdd() {
        if (!this.validEntry()) return;

        this.rowAdd(this.contractorslogGrid, this.contractorslog, {
            fclid: this.dESrvc.getMaxValue(this.contractorslog.items, 'fclid') + 1,
            fdate: this.CompanySvc.dateRenderer({value: new Date()})
        });
    }

    rowAdd(aGrid, aTable:app.IDataStore, aRow, aColumn = 0) {
        var idx = aTable.addRow(aRow);
        var row = aTable.items[idx-1];
        row.fcid = this.contractors.items[0].fcid; // Parent
        row.recid = this.dESrvc.getMaxValue(aTable.items, 'recid') + 1; // Needed by grid

        this.w2uiH.gridLoad(aGrid, aTable.items, false); // Load Data, no refresh
        this.w2uiH.gridScrollToLastRow(aGrid, aColumn, true); // Focus
    }

    contactsRemove(event) {
        this.rowRemove(event, this.contractorcontactsGrid, this.contractorcontacts);
    }

    divisionsRemove(event) {
        this.rowRemove(event, this.contractordivisionsGrid, this.contractordivisions);
    }

    logsRemove(event) {
        this.rowRemove(event, this.contractorslogGrid, this.contractorslog);
    }

    rowRemove(event, aGrid, aTable:app.IDataStore) {
        if (!this.validEntry()) return;
        var row = aGrid.api.getSelection(true);
        if (row.length == 0) return; // No selected row

        aTable.removeRow(event, aTable.items[row[0]]).then(() => {
            this.w2uiH.gridLoad(aGrid, aTable.items); // Load Data
        });
    }

    // Initialize Grid presentation (s/b on html)
    initGrids() {
        // agGrid
        this.listGrid = {
            enableFilter: true,
            onCellDoubleClicked: ((params)=> {
                this.retrieve(params.data.fcid);
                this.selectedTab = 1;
            }),
            columnDefs: [
                {field: "fcid", headerName: "ID", width: 80},
                {field: "fname", headerName: "Company", width: 300},
                {field: "ftype", headerName: "Type", width: 200},
                {field: "fphone", headerName: "Phone", width: 110, cellRenderer: this.CompanySvc.phoneRenderer},
                {field: "ffax", headerName: "Fax", width: 110, cellRenderer: this.CompanySvc.phoneRenderer},
                {field: "fcity", headerName: "City", width: 150},
                {field: "cfname", headerName: "Contact", width: 200},
                {field: "cfphone", headerName: "Phone", width: 110, cellRenderer: this.CompanySvc.phoneRenderer},
                {field: "femail", headerName: "Email", width: 250}
            ]
        };
        this.agH.gridInit(this.listGrid); // Set Default Values

        //w2grid
        this.contractorcontactsGrid = {
            name: 'cmg01',
            sortable: false,
            singleClickEdit: true,
            onChange: (event) => {
                this.$timeout(()=> { this.contractorcontactsGrid.api.mergeChanges() }); // Apply Changes
            },
            columns: [
                {field: "flast", caption: "Last", size: 200, editable: { type: 'text' }},
                {field: "ffirst", caption: "First", size: 200, editable: { type: 'text' }},
                {field: "ftitle", caption: "Title", size: 200, editable: { type: 'text' }},
                {field: "fphone", caption: "Phone", size: 110, min: 110, editable: { type: 'text' },
                    render: (record) => {return this.CompanySvc.phoneRenderer({value: record.fphone});}},
                {field: "fext", caption: "Extension", size: 100, editable: { type: 'text' }},
                {field: "fmobile", caption: "Mobile", size: 110, min: 110, editable: { type: 'text' },
                    render: (record) => {return this.CompanySvc.phoneRenderer({value: record.fmobile});}},
                {field: "femail", caption: "Email", size: 200, editable: { type: 'text' }},
                {field: "fnotes", caption: "Notes", size: 250, editable: { type: 'text' }}
            ]
        };

        //w2grid
        this.contractordivisionsGrid = {
            name: 'cmg02',
            sortable: false,
            singleClickEdit: true,
            onChange: (event) => {
                var rec = this.contractordivisions.items[event.index]; // Get row
                switch (event.column) {
                    case 0:
                        rec.fdid = event.value_new;
                        rec.cfdid = this.getDivisionsDescr('division', {fdid: rec.fdid}); // Set Desc
                        rec.fsmjid = '99';
                        rec.cfsmjid = '99 - Not Assigned';
                        rec.fsmnid = '99';
                        rec.cfsmnid = '99 - Not Assigned';
                        this.contractordivisionsGrid.api.refreshRow(event.recid); // Reload row
                        break;
                    case 1:
                        rec.fsmjid = event.value_new;
                        rec.cfsmjid = this.getDivisionsDescr('submajor', {fdid: rec.fdid, fsmjid: rec.fsmjid}); // Set Desc
                        rec.fsmnid = '99';
                        rec.cfsmnid = '99 - Not Assigned';
                        this.contractordivisionsGrid.api.refreshRow(event.recid); // Reload row
                        break;
                    case 2:
                        rec.fsmnid = event.value_new;
                        rec.cfsmnid = this.getDivisionsDescr('subminor', {fdid: rec.fdid, fsmjid: rec.fsmjid, fsmnid: rec.fsmnid}); // Set Desc
                        this.contractordivisionsGrid.api.refreshRow(event.recid); // Reload row
                        break;
                }

                this.$timeout(()=> { this.contractordivisionsGrid.api.mergeChanges() }); // Apply Changes
            },
            onEditField: (event) => {
                // Filter SELECT based on another columns
                switch (event.column) {
                    case 1:
                        var rec = this.contractordivisionsGrid.api.get(event.recid);
                        this.contractordivisionsGrid.api.getColumn('fsmjid').editable.items = this.filterDivisions('submajor', rec);
                        break;
                    case 2:
                        var rec = this.contractordivisionsGrid.api.get(event.recid);
                        this.contractordivisionsGrid.api.getColumn('fsmnid').editable.items = this.filterDivisions('subminor', rec);
                        break;
                }
            },
            columns: [
                {field: "fdid", caption: "Division", size: 200, editable: {type: 'select'}, render: (record) => {return record.cfdid;}},
                {field: "fsmjid", caption: "Sub-Division", size: 200, editable: {type: 'select'}, render: (record) => {return record.cfsmjid;}},
                {field: "fsmnid", caption: "Minor", size: 200, editable: {type: 'select'}, render: (record) => {return record.cfsmnid;}},
                {field: "fnotes", caption: "Notes", size: 250, editable: {type: 'text'}}
            ]
        };

        //w2grid
        this.contractorslogGrid = {
            name: 'cmg03',
            sortable: false,
            singleClickEdit: true,
            onChange: (event) => {
                var rec = this.contractorslog.items[event.index]; // Get row
                switch (event.column) {
                    case 1:
                        rec.faction = event.value_new;
                        rec.cfaction = this.$filter('filter')(this.cActions, {fid: rec.faction}, true)[0].fdescription;
                        this.contractorslogGrid.api.refreshRow(event.recid); // Reload row
                        break;
                    // case 0:
                    //     rec.fdate = event.value_new;
                    //     this.contractorslogGrid.api.refreshRow(event.recid); // Reload row
                    //     break;
                }

                this.$timeout(()=> { this.contractorslogGrid.api.mergeChanges() }); // Apply Changes
            },
            columns: [
                {field: "fdate", caption: "Date", size: 90, editable: {type: 'date', format: 'mm/dd/yyyy'}},
                {field: "faction", caption: "Action", size: 200, editable: {type: 'select'}, render: (record) => {return record.cfaction;}},
                {field: "fnotes", caption: "Notes", size: 250, editable: {type: 'text'}}
            ]
        };
    }
}

angular.module('app').controller('contractormaint', contractormaint);

