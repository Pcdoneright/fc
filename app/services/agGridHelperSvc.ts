//2015/09/29
///<reference path="../../typings/app.d.ts" />

// ag-Grid Helper
module app {
    "use strict";
    export interface IagGridHelperSvc {
        gridInit(pGrid);
        //gridDoubleClick(e): boolean;
        gridScrollToLastRow(pGrid:any, col:number, nofocus?:boolean);
        gridOnCellFocusedGetElement(pGrid:any, params);
        //gridScrollToRow(pGrid: any, col: number, row: any, nofocus?: boolean);
        //gridSelectText(options);
        //gridSelectRow(info): boolean;
        //gridRows(pGrid:any): any[];
    }

    class agGridHelperSvc implements IagGridHelperSvc{
        static $inject = ['$timeout', '$filter'];
        constructor(private $timeout, private $filter) {}

        // Default Global Settings
        gridInit(pGrid) {
            pGrid.rowHeight = 34;
            pGrid.headerHeight = 34;
            pGrid.rowData = []; // Prevents showing 'Loading...'
            pGrid.enableColResize = true;
            pGrid.rowSelection = 'single';
            if (!pGrid.hasOwnProperty('enableSorting')) pGrid.enableSorting = true;
            if (!pGrid.hasOwnProperty('onCellFocused')) pGrid.onCellFocused = function(params) {pGrid.api.selectIndex(params.rowIndex);};

            //pGrid.allowColumnResizing = true;
            //pGrid.allowColumnReordering = true;
            //if (!pGrid.columnAutoWidth) pGrid.columnAutoWidth = true;
            //pGrid.showRowLines = true;
            //if (!pGrid.sorting) pGrid.sorting = { mode: 'multiple' };
            //if (!pGrid.scrolling)  pGrid.scrolling = {mode: 'infinite', useNativeScrolling: true};
            ////pGrid.scrolling = {mode: 'virtual', useNativeScrolling: true};
            //pGrid.paging = { enabled: false, pageSize: 0 }; // PageSize prevents error showing 40 rows only
            //pGrid.loadPanel = false;
            //pGrid.rowAlternationEnabled = true;
            //if (!pGrid.selection) pGrid.selection = { mode: 'single' }; // if not assign
            //if (!pGrid.onInitialized) pGrid.onInitialized = (e) => { pGrid.gridApi = e.component; }; // Save object pointer
            //
            //// For each Column allowEditing = false
            //for (var i = 0; i < pGrid.columns.length; i++) {
            //    if (!pGrid.columns[i].allowEditing) pGrid.columns[i].allowEditing = false; // if not assign
            //}

            // Override Function Bug //TODO: Check with new version
            this.$timeout(()=> {
                var to = this.$timeout;
                pGrid.api.setFocusedCell = function (rowIndex:any, colIndex:any) {
                    var renderedRow = this.rowRenderer.renderedRows[rowIndex];
                    var column = this.rowRenderer.columnModel.getAllDisplayedColumns()[colIndex];
                    if (renderedRow && column) {
                        var eCell = renderedRow.getCellForCol(column);
                        this.rowRenderer.focusCell(eCell, rowIndex, colIndex, column.getColDef(), true);
                        to(()=> {eCell.click()}, 50); // Enable Editing
                    }
                };
            }, 100);
        }

        // Get Element when inside 'OnCellFocused'
        gridOnCellFocusedGetElement(pGrid:any, params) {
            var renderedRow = pGrid.api.rowRenderer.renderedRows[params.rowIndex];
            var column = this.$filter('filter')(pGrid.api.rowRenderer.columnModel.getAllDisplayedColumns(), {colId: params.colId}, true)[0];
            return renderedRow.getCellForCol(column);
        }

        // For dx-data-grid scroll to last row and focus on specific column
        gridScrollToLastRow(pGrid:any, col:number, nofocus?:boolean) {
            // Use timeout since the row will be added to the grid after scope leaves
            this.$timeout(() => {
                var row = pGrid.rowData.length;
                if (row == 0) return;

                pGrid.api.ensureIndexVisible(row - 1); // Bring to view
                pGrid.api.selectIndex(row -1);
                if (!nofocus) this.$timeout(()=> {pGrid.api.setFocusedCell(row - 1, col)}, 10);
            }, 100);
        }

        // Scroll to a row and column and select it unless 'nofucus = true'
        //gridScrollToRow(pGrid: any, col: number, row: any, nofocus?: boolean) {
        //    // Use timeout since ui-grid will only add the row after scope leaves
        //    this.$timeout(() => {
        //        if (pGrid.gridApi.totalCount() == 0) return; // No rows return
        //        var idx = pGrid.gridApi.getRowIndexByKey(row);
        //
        //        if (nofocus) {
        //            pGrid.gridApi.selectRowsByIndexes(idx);
        //        }
        //        else {
        //            pGrid.gridApi.editCell(idx, col);
        //        }
        //    }, 50);
        //}

        //gridSelectRow(info) {
        //    if (info.data !== info.component.getSelectedRowsData()[0]) {
        //        info.component.selectRows(info.data); // Select row for current cell
        //        return true;
        //    }
        //    return false;
        //}

        //gridSelectText(options) {
        //    var minput = options.editorElement.find("input");
        //    minput.length && this.$timeout(() => {minput[0].select()}, 100);
        //}
        //
        //gridRows(pGrid) {
        //    return pGrid.gridApi._controllers.data._dataSource.items();
        //    //return pGrid.gridApi._controllers.data._dataSource._items;
        //}
    }

    // Register service
    angular.module('app').service('agGridHelperSvc', agGridHelperSvc);
}