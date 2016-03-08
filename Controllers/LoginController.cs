using ServerData;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web;
using System.Web.Http;

namespace pcdr.Controllers
{
    public class LoginController : ApiController
    {
        pcdrEntities _db = new pcdrEntities();

        //public dynamic Post() //[FromBody]string userid, [FromBody]string password) //string userid, string password)
        public dynamic Getlogin(string userid, string pswd)
        {
            _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'

            var ret = _db.users.Where(q => q.fuserid == userid && q.fpassword == pswd && q.factive == true); // active

            if (ret.Count() > 0)
            {
                var usr = ret.FirstOrDefault();
                var retuser = new
                {
                    fname = usr.ffirst, // + ' ' + ret.FirstOrDefault().flast,
                    usr.fuid,
                    usr.fisadmin,
                    //flocation = ret.FirstOrDefault().flocation,
                    _db.companies.FirstOrDefault().freportserver
                }; // Return username, branch, branch name, fuid, fisadmin

                // Return Main Menu Structure
                var ret2 = from grp in _db.groups_access.Where(t => t.fgroupid == usr.fgroupid)
                           from prog in _db.programs.Where(t => t.fprogid == grp.fprogid && t.fviewname != null)
                           from cd in _db.code_detail.Where(t => t.fgroupid == "MM" && t.fid == prog.fgrouptype)
                           orderby prog.fgrouptype, grp.fsequence
                           select new
                           {
                               id = prog.fviewname,
                               fwindow = prog.fwindow,
                               groupname = cd.fdescription,
                               text = prog.fname,
                               seq = grp.fsequence
                           };

                return new
                {
                    success = true,
                    data = ret2,
                    user = retuser
                };
            }

            return new { success = false };
        }
    }

    //public class menudata
    //{
    //    public string id { get; set; }
    //    public string fwindow { get; set; }
    //    public string groupname { get; set; }
    //    public string text { get; set; }
    //    public int seq { get; set; }
    //}
}
