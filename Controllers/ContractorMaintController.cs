using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using pcdr.Controllers;
using ServerData;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mail;
using System.Transactions;
using System.Web.Hosting;
using System.Web.Http;

namespace fc.Controllers
{
    public class ContractorMaintController : BaseController
    {
        // Could not group results by ct.fid
        public dynamic XGetContactList(string pfdid, string pfsmjid, string pfsmnid)
        {
            var ret = from ct in _db.contractors
                      from ctc in _db.contractorcontacts.Where(t => t.fcid == ct.fcid)
                      from cd in _db.code_detail.Where(t => t.fgroupid == "CT" && t.fid == ct.ftype).DefaultIfEmpty() // Left Join
                      orderby ct.fname
                      select new
                      {
                          ct.fcid,
                          ftype = cd.fdescription,
                          ct.fname,
                          ct.fphone,
                          ct.ffax,
                          ct.fcity,
                          ctc.fctid,
                          cfname = ctc.flast + " " + ctc.ffirst,
                          ctc.ftitle,
                          cfphone = ctc.fphone,
                          ctc.fext,
                          ctc.fmobile,
                          ctc.femail
                      };

            if (pfdid != "A" && pfsmjid == "A" && pfsmnid == "A")
                // Contains specified Division 
                ret = ret.Where(c => _db.contractordivisions.Where(t => t.fdid == pfdid).Select(t => t.fcid).Contains(c.fcid));

            else if (pfdid != "A" && pfsmjid != "A" && pfsmnid == "A")
                // Contains specified Division, Subdivision
                ret = ret.Where(c => _db.contractordivisions.Where(t => t.fdid == pfdid && t.fsmjid == pfsmjid).Select(t => t.fcid).Contains(c.fcid));

            else if (pfdid != "A" && pfsmjid != "A" && pfsmnid != "A")
                // Contains specified Division, Subdivision, minor
                ret = ret.Where(c => _db.contractordivisions.Where(t => t.fdid == pfdid && t.fsmjid == pfsmjid && t.fsmnid == pfsmnid).Select(t => t.fcid).Contains(c.fcid));

            return ret;
        }

        public dynamic GetContactList(string pfdid, string pfsmjid, string pfsmnid)
        {
            var sql = "select ct.fcid, ct.fname, ct.fphone, ct.ffax, ct.fcity, " +
                "ctc.fctid, CONCAT(ctc.flast, ' ', ctc.ffirst) as cfname, ctc.ftitle, ctc.fphone as cfphone, ctc.fext, ctc.fmobile, ctc.femail, " +
                "cd.fdescription as ftype " +
                "from contractors ct " +
                "JOIN contractorcontacts ctc ON ctc.fcid = ct.fcid " +
                "LEFT JOIN code_detail cd ON cd.fid = ct.ftype AND cd.fgroupid = 'CT' ";

            if (pfdid != "A")
            {
                // Contains specified Division 
                sql += "WHERE ct.fcid IN (SELECT fcid FROM contractordivisions WHERE fdid = '" + pfdid + "' ";

                if (pfsmjid != "A")
                    // Contains specified sub-Division 
                    sql += "AND fsmjid = '" + pfsmjid + "' ";
                
                if (pfsmnid != "A")
                    // Contains specified sub-minor
                    sql += "AND fsmnid = '" + pfsmnid + "' ";
                
                sql += ") "; // Close Statement
            }

            sql += "GROUP BY ct.fcid ORDER BY ct.fname";

            return _db.Database.SqlQuery<dummy01>(sql).ToArray();
        }

        public dynamic GetContractor()
        {
            int pfcid = int.Parse(ofGetParm("pfcid")); // Get Parameter

            var mCd = from cv in _db.contractordivisions.Where(t => t.fcid == pfcid)
                      from div in _db.divisions.Where(t => t.fdid == cv.fdid).DefaultIfEmpty()
                      from sub in _db.submajors.Where(t => t.fdid == cv.fdid && t.fsmjid == cv.fsmjid).DefaultIfEmpty()
                      from mnr in _db.subminors.Where(t => t.fdid == cv.fdid && t.fsmjid == cv.fsmjid && t.fsmnid == cv.fsmnid).DefaultIfEmpty()
                      select new
                      {
                          cv.fcid,
                          cv.fcdid,
                          cv.fdid,
                          cv.fsmjid,
                          cv.fsmnid,
                          cv.fnotes,
                          cfdid = cv.fdid + " - " + div.fdescription,
                          cfsmjid = cv.fsmjid + " - " + sub.fdescription,
                          cfsmnid = cv.fsmnid + " - " + mnr.fdescription
                      };

            var mcl = from cl in _db.contractorslogs.Where(t => t.fcid == pfcid)
                      from cd in _db.code_detail.Where(t => t.fgroupid == "LA" && t.fid == cl.faction).DefaultIfEmpty()
                      select new
                      {
                          cl.fcid,
                          cl.fclid,
                          cl.fdate,
                          cl.faction,
                          cfaction = cd.fdescription
                      };

            return new
            {
                contractors = _db.contractors.Where(t => t.fcid == pfcid),
                contractorcontacts = _db.contractorcontacts.Where(t => t.fcid == pfcid),
                contractordivisions = mCd,
                contractorslogs = mcl
            };
        }
        
        // Update in transaction manner TOPDOWN(insert/update), BOTTOMUP(delete)
        public dynamic Postupdate(JArray pPostedData)
        {
            bool mCommit = true;
            _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'

            var serializer = new JsonSerializer();

            var contractorsinsert = new List<contractor>();
            var contractorsupdate = new List<contractor>();
            var contractorsdelete = new List<contractor>();

            var contractorcontactsinsert = new List<contractorcontact>();
            var contractorcontactsupdate = new List<contractorcontact>();
            var contractorcontactsdelete = new List<contractorcontact>();

            var contractordivisionsinsert = new List<contractordivision>();
            var contractordivisionsupdate = new List<contractordivision>();
            var contractordivisionsdelete = new List<contractordivision>();

            var contractorslogsinsert = new List<contractorslog>();
            var contractorslogsupdate = new List<contractorslog>();
            var contractorslogsdelete = new List<contractorslog>();

            // inspection
            ofPopulateModel(pPostedData, contractorsinsert, "contractorsinsert", "ServerData.contractor, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, contractorsupdate, "contractorsupdate", "ServerData.contractor, ServerData", serializer); // Fill Updates
            ofPopulateModel(pPostedData, contractorsdelete, "contractorsdelete", "ServerData.contractor, ServerData", serializer); // Fill Deletes

            ofPopulateModel(pPostedData, contractorcontactsinsert, "contractorcontactsinsert", "ServerData.contractorcontact, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, contractorcontactsupdate, "contractorcontactsupdate", "ServerData.contractorcontact, ServerData", serializer); // Fill Updates
            ofPopulateModel(pPostedData, contractorcontactsdelete, "contractorcontactsdelete", "ServerData.contractorcontact, ServerData", serializer); // Fill Deletes

            ofPopulateModel(pPostedData, contractordivisionsinsert, "contractordivisionsinsert", "ServerData.contractordivision, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, contractordivisionsupdate, "contractordivisionsupdate", "ServerData.contractordivision, ServerData", serializer); // Fill Updates
            ofPopulateModel(pPostedData, contractordivisionsdelete, "contractordivisionsdelete", "ServerData.contractordivision, ServerData", serializer); // Fill Deletes

            ofPopulateModel(pPostedData, contractorslogsinsert, "contractorsloginsert", "ServerData.contractorslog, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, contractorslogsupdate, "contractorslogupdate", "ServerData.contractorslog, ServerData", serializer); // Fill Updates
            ofPopulateModel(pPostedData, contractorslogsdelete, "contractorslogdelete", "ServerData.contractorslog, ServerData", serializer); // Fill Deletes


            // Update using transaction
            using (TransactionScope transaction = new TransactionScope())
            {
                try
                {
                    foreach (contractorslog sc in contractorslogsdelete) _db.contractorslogs.Remove(_db.contractorslogs.Find(sc.fclid));
                    foreach (contractordivision sc in contractordivisionsdelete) _db.contractordivisions.Remove(_db.contractordivisions.Find(sc.fcid, sc.fdid, sc.fsmjid, sc.fsmnid));
                    foreach (contractorcontact sc in contractorcontactsdelete) _db.contractorcontacts.Remove(_db.contractorcontacts.Find(sc.fctid, sc.fcid));
                    foreach (contractor sc in contractorsdelete) _db.contractors.Remove(_db.contractors.Find(sc.fcid));

                    ofDBSave(contractorsinsert, _db.contractors, "I"); // Insert
                    ofDBSave(contractorsupdate, _db.contractors, "U"); // Update

                    ofDBSave(contractorcontactsinsert, _db.contractorcontacts, "I"); // Insert
                    ofDBSave(contractorcontactsupdate, _db.contractorcontacts, "U"); // Update

                    ofDBSave(contractordivisionsinsert, _db.contractordivisions, "I"); // Insert
                    ofDBSave(contractordivisionsupdate, _db.contractordivisions, "U"); // Update

                    ofDBSave(contractorslogsinsert, _db.contractorslogs, "I"); // Insert
                    ofDBSave(contractorslogsupdate, _db.contractorslogs, "U"); // Update
                    
                    _db.SaveChanges();
                }
                catch
                {
                    mCommit = false;
                }

                if (mCommit) transaction.Complete();
            }

            return new
            {
                success = mCommit,
            };
        }
        
    }

    class dummy01
    {
        public int fcid { get; set; }
        public string ftype { get; set; }
        public string fname { get; set; }
        public string fphone { get; set; }
        public string ffax { get; set; }
        public string fcity { get; set; }
        public string fctid { get; set; }
        public string cfname { get; set; }
        public string ftitle { get; set; }
        public string cfphone { get; set; }
        public string fext { get; set; }
        public string fmobile { get; set; }
        public string femail { get; set; }
    }
}
