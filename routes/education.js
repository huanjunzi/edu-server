const router = require('koa-router')()
const mysql = require('../lib/mysql.js')
let _ = require('underscore')
router.prefix('/api/education')


router.get('/findClasses', async (ctx, next) => {
  // let params = _.toArray(ctx.request.query)
  const r = await mysql.findClasses(ctx.request.query)
  if(r.length > 0){
    console.log("success=", r)
    ctx.body = {
      message: "success",
      rows: r
    }
    return
  }
  ctx.body = {
    message: "failed"
  }
})

router.get('/downloadExcel', async (ctx, next) => {
  return ctx.body = await mysql.downloadExcel(ctx.request.query,ctx)
})
module.exports = router
