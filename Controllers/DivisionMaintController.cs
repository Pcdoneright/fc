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
    public class DivisionMaintController : BaseController
    {
        public dynamic GetDivision()
        {
            var div = from dm in _db.divisions
                      select new
                      {
                          dm.fdid,
                          dm.fdescription,
                          cfdescription = dm.fdid + " - " + dm.fdescription
                      };
            
            var submj = from dm in _db.submajors
                      select new
                      {
                          dm.fdid,
                          dm.fsmjid,
                          dm.fdescription,
                          cfdescription = dm.fsmjid + " - " + dm.fdescription
                      };

            var subm = from dm in _db.subminors
                        select new
                        {
                            dm.fdid,
                            dm.fsmjid,
                            dm.fsmnid,
                            dm.fdescription,
                            cfdescription = dm.fsmnid + " - " + dm.fdescription
                        };
            
            return new
            {
                divisions = div,
                submajors = submj,
                subminors = subm
            };
        }

        // Update in transaction manner TOPDOWN(insert/update), BOTTOMUP(delete)
        public dynamic Postupdate(JArray pPostedData)
        {
            bool mCommit = true;
            _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'

            var serializer = new JsonSerializer();

            var divisionsinsert = new List<division>();
            var divisionsupdate = new List<division>();
            var divisionsdelete = new List<division>();

            var submajorsinsert = new List<submajor>();
            var submajorsupdate = new List<submajor>();
            var submajorsdelete = new List<submajor>();

            var subminorsinsert = new List<subminor>();
            var subminorsupdate = new List<subminor>();
            var subminorsdelete = new List<subminor>();

            // inspection
            ofPopulateModel(pPostedData, divisionsinsert, "divisionsinsert", "ServerData.division, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, divisionsupdate, "divisionsupdate", "ServerData.division, ServerData", serializer); // Fill Updates
            ofPopulateModel(pPostedData, divisionsdelete, "divisionsdelete", "ServerData.division, ServerData", serializer); // Fill Deletes

            ofPopulateModel(pPostedData, submajorsinsert, "submajorsinsert", "ServerData.submajor, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, submajorsupdate, "submajorsupdate", "ServerData.submajor, ServerData", serializer); // Fill Updates
            ofPopulateModel(pPostedData, submajorsdelete, "submajorsdelete", "ServerData.submajor, ServerData", serializer); // Fill Deletes

            ofPopulateModel(pPostedData, subminorsinsert, "subminorsinsert", "ServerData.subminor, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, subminorsupdate, "subminorsupdate", "ServerData.subminor, ServerData", serializer); // Fill Updates
            ofPopulateModel(pPostedData, subminorsdelete, "subminorsdelete", "ServerData.subminor, ServerData", serializer); // Fill Deletes

            // Update using transaction
            using (TransactionScope transaction = new TransactionScope())
            {
                try
                {
                    foreach (subminor sc in subminorsdelete) _db.subminors.Remove(_db.subminors.Find(sc.fsmnid, sc.fsmjid, sc.fdid));
                    foreach (submajor sc in submajorsdelete) _db.submajors.Remove(_db.submajors.Find(sc.fsmjid, sc.fdid));
                    foreach (division sc in divisionsdelete) _db.divisions.Remove(_db.divisions.Find(sc.fdid));

                    ofDBSave(divisionsinsert, _db.divisions, "I"); // Insert
                    ofDBSave(divisionsupdate, _db.divisions, "U"); // Update
                    
                    ofDBSave(submajorsinsert, _db.submajors, "I"); // Insert
                    ofDBSave(submajorsupdate, _db.submajors, "U"); // Update

                    ofDBSave(subminorsinsert, _db.subminors, "I"); // Insert
                    ofDBSave(subminorsupdate, _db.subminors, "U"); // Update

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
}
