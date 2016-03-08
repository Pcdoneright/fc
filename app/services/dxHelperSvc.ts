//2015/10/02
///<reference path="../../typings/app.d.ts" />

module app {
    "use strict";
    export interface IdxHelperSvc {
        gridInit(pGrid);
        gridDoubleClick(e): boolean;
        gridScrollToLastRow(pGrid:any, col:number, nofocus?:boolean);
        gridScrollToRow(pGrid: any, col: number, row: any, nofocus?: boolean);
        gridSelectText(options);
        gridSelectRow(info): boolean;
        gridRows(pGrid:any): any[];
    }

    class dxHelperSvc implements IdxHelperSvc{
        static $inject = ['$timeout'];
        constructor(private $timeout) {}

        // Default Global Settings
        gridInit(pGrid) {
            pGrid.allowColumnResizing = true;
            pGrid.allowColumnReordering = true;
            if (!pGrid.columnAutoWidth) pGrid.columnAutoWidth = true;
            pGrid.showRowLines = true;
            if (!pGrid.sorting) pGrid.sorting = { mode: 'multiple' };
            if (!pGrid.scrolling)  pGrid.scrolling = {mode: 'infinite', useNative: true};
            //pGrid.scrolling = {mode: 'virtual', useNativeScrolling: true};
            pGrid.paging = { enabled: false, pageSize: 0 }; // PageSize prevents error showing 40 rows only
            pGrid.loadPanel = false;
            pGrid.rowAlternationEnabled = true;
            if (!pGrid.selection) pGrid.selection = { mode: 'single' }; // if not assign
            if (!pGrid.onInitialized) pGrid.onInitialized = (e) => { pGrid.gridApi = e.component; }; // Save object pointer

            // For each Column allowEditing = false
            for (var i = 0; i < pGrid.columns.length; i++) {
                if (!pGrid.columns[i].allowEditing) pGrid.columns[i].allowEditing = false; // if not assign
            }
        }

        gridDoubleClick(e) {
            var component = e.component, prevClickTime = component.lastClickTime;
            component.lastClickTime = new Date();
            return (prevClickTime && (component.lastClickTime - prevClickTime < 300));
        }

        // For dx-data-grid scroll to last row and focus on specific column
        gridScrollToLastRow(pGrid:any, col:number, nofocus?:boolean) {
            // Use timeout since the row will be added to the grid after scope leaves
            this.$timeout(() => {
                //var row = pGrid.gridApi._controllers.data._dataSource._items.length;
                var row = pGrid.gridApi.totalCount();
                //console.log(row);
                //console.log(pGrid.gridApi._controllers.data._dataSource._items.length);
                if (row == 0) return;

                if (nofocus) pGrid.gridApi.selectRowsByIndexes(row - 1);
                else pGrid.gridApi.editCell(row - 1, col);

                this._scrolltorow(pGrid);
            }, 150);
        }

        // Scroll to a row and column and select it unless 'nofucus = true'
        gridScrollToRow(pGrid: any, col: number, rowData: any, nofocus?: boolean) {
            // Use timeout since ui-grid will only add the row after scope leaves
            this.$timeout(() => {
                if (pGrid.gridApi.totalCount() == 0) return; // No rows return
                var idx = pGrid.gridApi.getRowIndexByKey(rowData);

                if (nofocus) {
                    pGrid.gridApi.selectRowsByIndexes(idx);
                    this._scrolltorow(pGrid);
                }
                else {
                    pGrid.gridApi.editCell(idx, col);
                    this._scrolltorow(pGrid);
                }
            }, 50);
        }

        gridSelectRow(info) {
            if (info.data !== info.component.getSelectedRowsData()[0]) {
                info.component.selectRows(info.data); // Select row for current cell
                return true;
            }
            return false;
        }

        gridSelectText(options) {
            var minput = options.editorElement.find("input");
            minput.length && this.$timeout(() => {minput[0].select()}, 100);
        }

        gridRows(pGrid) {
            return pGrid.gridApi._controllers.data._dataSource.items();
            //return pGrid.gridApi._controllers.data._dataSource._items;
        }

        // Scroll to one(1) selected row
        _scrolltorow(pGrid) {
            var scrollable = pGrid.gridApi.getView('rowsView')._scrollable;
            var selectedRowElements = pGrid.gridApi.element().find('tr.dx-selection');
            scrollable.scrollToElement(selectedRowElements);
        }
    }

    // Register service
    angular.module('app').service('dxHelperSvc', dxHelperSvc);
}