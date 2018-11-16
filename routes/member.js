const router = require('koa-router')()
const mysql = require('../lib/mysql.js')
let _ = require('underscore')
router.prefix('/api/member')

router.get('/findMember', async (ctx,next) => {
  let r = await mysql.findMember(ctx.request.query)
  // r = r.map(i => {
  //   i._disabled = true
  //   i._checked = true
  //   return i
  // })
  if(r.length > 0){
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
// 编辑或是创建客户
router.post('/editMember', async (ctx, next) => {
  const r = await mysql.editMember(ctx.request.query)
  if(r.length > 0){
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

// 删除客户
router.post('/deleteMember', async (ctx, next) => {
  const r = await mysql.deleteMember(ctx.request.query)
  if(r.length > 0){
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

// 下载excel表格
router.get('/downloadMemberExcel', async (ctx, next) => {
  return ctx.body = await mysql.downloadMemberExcel(ctx.request.query,ctx)
})

module.exports = router
