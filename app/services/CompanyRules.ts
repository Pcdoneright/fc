///<reference path="../../typings/app.d.ts" />

module app {
    "use strict";

    export class companyRules {
        static $inject = ['$filter'];
        constructor(private $filter:ng.IFilterService) {}

        // Calculate Selling Price to the next nickel
        calcSellPrice(priceclass: any[], IUflockclassprice:number,  fpcid:number, IMfbaseprice: number, IMffreightcost: number, IUfunits: number, IUfusablep: number, IUfcostplus: number, CIflockprice: number, Cfcommissionp: number): {} {
            var pcR;
            var mfcommissionp;
            var mprice;
            // PriceClass To Use:
            // IU-flockclassprice Has Priority
            // CI-fpcid Has Next Priority
            // C-fpcid Has Next Priority
            if (IUflockclassprice) {
                pcR = this.$filter('filter')(priceclass, {fpcid: IUflockclassprice}, true)[0];
                mfcommissionp = pcR.fsalescomission;
            }
            else {
                pcR = this.$filter('filter')(priceclass, {fpcid: fpcid}, true)[0];
                mfcommissionp = pcR.fsalescomission;
            }

            if (CIflockprice > 0 && (!IUflockclassprice)) return {fprice: CIflockprice, fcommissionp: Cfcommissionp}; // CI-Lock-Price Has Priority when IUflockclassprice does not exist

            var mUnitCost = this.getUnitCost(IMfbaseprice, IMffreightcost, IUfunits, IUfusablep);
            if (pcR.fusecostplus) {
                mprice = mUnitCost + IUfcostplus; // PC-fusecostplus Has next Priority
                mfcommissionp = Cfcommissionp; // Use default commissionp
            }
            else {
                mprice = Math.ceil(mUnitCost / ((100 - pcR.fpercentage) / 100) / 0.05) * 0.05;
            }

            return {fprice: mprice, fcommissionp: mfcommissionp}; // Up Nickel
        }

        // Calculate Unit Cost
        getUnitCost(IMfbaseprice: number, IMffreightcost: number, IUfunits: number, IUfusablep: number): number {
            var mUsablep = IUfusablep == 0 ? 100 : IUfusablep; // Prevent div/0
            return r2d((IMfbaseprice + IMffreightcost) / (mUsablep / 100) * IUfunits);
        }

        // Calculate Sales Detail
        salesdetailsCalculate(sdRow, pfstatus) {
            if (('E,W,D,S,I').indexOf(pfstatus) > 0) {
                sdRow.cextended = r2d(sdRow.fprice * sdRow.fshipqty);
            }
            else
            {
                sdRow.cextended = r2d(sdRow.fprice * sdRow.fqty);
            }

            sdRow.fcommission = r2d(sdRow.cextended * (sdRow.fcommissionp / 100));
        }

        // Calculate Sales Order Total
        salesordersTotals(soRow, sdRows, pTaxRate) {
            soRow.ftaxabletotal = 0;
            soRow.fnontaxabletotal = 0;
            soRow.fdiscount = 0;
            soRow.fchange = 0;
            soRow.ftotalpayment = 0;
            soRow.fcommission = 0;

            // Loop details
            for (var i = 0; i < sdRows.length; i++) {
                if (sdRows[i].fistaxable)
                    soRow.ftaxabletotal += sdRows[i].cextended;
                else
                    soRow.fnontaxabletotal += sdRows[i].cextended;

                soRow.fcommission += sdRows[i].fcommission;
            }
            soRow.fnontaxabletotal = r2d(soRow.fnontaxabletotal);

            var trate = pTaxRate / 100; // Get proper decimal
            soRow.ftax = r2d(soRow.ftaxabletotal * trate);
            soRow.ftotal = r2d(soRow.ftaxabletotal + soRow.ftax + soRow.fnontaxabletotal);

            // Computed
            soRow.cfsubtotal = soRow.ftaxabletotal + soRow.fnontaxabletotal;

            // if discount rate is specified, discount is % of ftotal
            if (soRow.fdiscountp > 0) {
                var drate = soRow.fdiscountp / 100;
                soRow.fdiscount = r2d(soRow.ftotal * drate);
                soRow.ftotal = r2d(soRow.ftotal - soRow.fdiscount);
            }

            // Calculate change and re-assign ftotalpayment
            if (soRow.ftotalpayment > soRow.ftotal) {
                soRow.fchange = r2d(soRow.ftotalpayment - soRow.ftotal);
                soRow.ftotalpayment = soRow.ftotal;
            }

            soRow.fbalance = r2d(soRow.ftotal - soRow.ftotalpayment);
        }
    }
}

angular.module('app').service('companyRules', app.companyRules);