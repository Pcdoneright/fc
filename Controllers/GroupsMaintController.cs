using pcdr.Controllers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
//using System.Web.Mvc;
using System.Transactions;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json;
using ServerData;

namespace pcdr.Controllers
{
    public class GroupsMaintController : BaseController
    {
        public dynamic GetGroups()
        {
            var rga = from ga in _db.groups_access
                      from pg in _db.programs.Where(t => t.fprogid == ga.fprogid)
                      orderby ga.fsequence
                select new {
                   ga.fprogid,
                   ga.faccess,
                   ga.fgroupid,
                   ga.fsequence,
                   cfname = pg.fname
                };

            return new
            {
                groups = _db.groups,
                groups_access = rga
            };
        }

        public dynamic GetPrograms()
        {
            return _db.programs.Where(t => t.fviewname != null).OrderBy(t => t.fname);
        }

        // Update in transaction manner TOPDOWN(insert/update), BOTTOMUP(delete)
        public dynamic Postupdate(JArray pPostedData)
        {
            bool mCommit = true;
            var serializer = new JsonSerializer();

            var groupsinsert = new List<group>();
            var groupsupdate = new List<group>();
            var groupsdelete = new List<group>();
            var groups_accesssinsert = new List<groups_access>();
            var groups_accesssupdate = new List<groups_access>();
            var groups_accesssdelete = new List<groups_access>();

            // Master
            ofPopulateModel(pPostedData, groupsinsert, "groupsinsert", "ServerData.group, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, groupsupdate, "groupsupdate", "ServerData.group, ServerData", serializer); // Fill Update
            ofPopulateModel(pPostedData, groupsdelete, "groupsdelete", "ServerData.group, ServerData", serializer); // Fill Deletes
            // Detail
            ofPopulateModel(pPostedData, groups_accesssinsert, "groups_accessinsert", "ServerData.groups_access, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, groups_accesssupdate, "groups_accessupdate", "ServerData.groups_access, ServerData", serializer); // Fill Update
            ofPopulateModel(pPostedData, groups_accesssdelete, "groups_accessdelete", "ServerData.groups_access, ServerData", serializer); // Fill Deletes

            // Update using transaction
            using (TransactionScope transaction = new TransactionScope())
            {
                try
                {
                    // TOPDOWN insert,update
                    ofDBSave(groupsinsert, _db.groups, "I"); // Insert
                    ofDBSave(groupsupdate, _db.groups, "U"); // Update

                    ofDBSave(groups_accesssinsert, _db.groups_access, "I"); // Insert
                    ofDBSave(groups_accesssupdate, _db.groups_access, "U"); // Update

                    // BOTTOMUP delete
                    foreach (groups_access sc in groups_accesssdelete) _db.groups_access.Remove(_db.groups_access.Find(sc.fgroupid, sc.fprogid));
                    foreach (group sc in groupsdelete) _db.groups.Remove(_db.groups.Find(sc.fgroupid));
                    _db.SaveChanges();
                }
                catch (InvalidCastException e)
                {
                    mCommit = false;
                }

                if (mCommit) transaction.Complete();
            }

            return new
            {
                success = mCommit
            };
        }
    }
}