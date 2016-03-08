//2015/09/29
///<reference path="../../typings/app.d.ts" />

// w2ui Helper
module app {
    "use strict";
    export interface Iw2uiHelperSvc {
        gridInit(pGrid);
        gridLoad(pGrid, pData);
        //gridDoubleClick(e): boolean;
        gridScrollToLastRow(pGrid:any, col:number, nofocus?:boolean);
        arrayToSelect(pArray:any[], pid:string, pText:string)
        // gridOnCellFocusedGetElement(pGrid:any, params);
        //gridScrollToRow(pGrid: any, col: number, row: any, nofocus?: boolean);
        //gridSelectText(options);
        //gridSelectRow(info): boolean;
        //gridRows(pGrid:any): any[];
    }

    class w2uiHelperSvc implements Iw2uiHelperSvc{
        static $inject = ['$timeout', '$filter'];
        constructor(private $timeout, private $filter) {}

        // Default Global Settings
        gridInit(pGrid) {
            // pGrid.enableColResize = true;
            // pGrid.rowSelection = 'single';
            // if (!pGrid.hasOwnProperty('enableSorting')) pGrid.enableSorting = true;
            // if (!pGrid.hasOwnProperty('onCellFocused')) pGrid.onCellFocused = function(params) {pGrid.api.selectIndex(params.rowIndex);};

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

            if (!pGrid.hasOwnProperty('recordHeight')) {pGrid.recordHeight = 34}
            if (!pGrid.hasOwnProperty('reorderColumns')) {pGrid.reorderColumns = true}
            if (!pGrid.hasOwnProperty('sortable')) {pGrid.sortable = true}
            if (pGrid.hasOwnProperty('singleClickEdit')) {
                pGrid.onClick = (event) => { this.$timeout(()=>{pGrid.api.editField(event.recid, event.column);})};
            }
            // if (pGrid.hasOwnProperty('singleClickEdit')) {
            //     pGrid.onClick = function (event) {this.editField(event.recid, event.column);}
            // }

            // For each Column set properties
            var len = pGrid.columns.length;
            for (var i = 0; i < len; i++) {
                if (!pGrid.columns[i].hasOwnProperty('resizable')) {pGrid.columns[i].resizable = true} // resizable
                if (!pGrid.columns[i].hasOwnProperty('sortable')) {pGrid.columns[i].sortable = pGrid.sortable} // sortable
            }

            // Register but check if exist first
            if(w2ui.hasOwnProperty(pGrid.name)){ w2ui[pGrid.name].destroy(); }
            $('#' + pGrid.name).w2grid(pGrid);
            pGrid.api = w2ui[pGrid.name];
        }

        gridLoad(pGrid, pData, pRefresh = true) {
            // Add recid, but if found exit
            var arrayLength = pData.length;
            for (var i = 0; i < arrayLength; i++) {
                if (pData.hasOwnProperty('recid')) {break;}
                pData[i].recid = i + 1;
            }
            pGrid.api.clear(); // Remove all rows
            pGrid.api.add(pData); // Add to Table
            if (pRefresh) {this.$timeout(()=> { pGrid.api.refresh()})} // Since inside Init
        }

        gridResize(pGrid) {
            this.$timeout(() => {if (pGrid.hasOwnProperty('api')) pGrid.api.resize()}, 100);
        }

        // // Get Element when inside 'OnCellFocused'
        // gridOnCellFocusedGetElement(pGrid:any, params) {
        //     var renderedRow = pGrid.api.rowRenderer.renderedRows[params.rowIndex];
        //     var column = this.$filter('filter')(pGrid.api.rowRenderer.columnModel.getAllDisplayedColumns(), {colId: params.colId}, true)[0];
        //     return renderedRow.getCellForCol(column);
        // }

        // For dx-data-grid scroll to last row and focus on specific column
        gridScrollToLastRow(pGrid:any, col:number, pEdit = false) {
            var row = pGrid.api.records.length;
            if (row == 0) return;
            if (!pEdit) { pGrid.api.select(pGrid.api.records[row-1].recid); }
            else { pGrid.api.editField(pGrid.api.records[row-1].recid, col);}
        }

        // Add id & text properties for SELECT to work
        arrayToSelect(pArray:any[], pid:string, pText:string) {
            for (var i = 0; i < pArray.length; i++) {
                var obj = pArray[i];
                obj.id = obj[pid];
                obj.text = obj[pText];
            }
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
    angular.module('app').service('w2uiHelperSvc', w2uiHelperSvc);
}