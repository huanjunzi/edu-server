const router = require('koa-router')()
const mysql = require('../lib/mysql.js')
let _ = require('underscore')
router.prefix('/api/child')

router.get('/findChild', async (ctx,next) => {
  let r = await mysql.findChild(ctx.request.query)
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
router.post('/editChild', async (ctx, next) => {
  const r = await mysql.editChild(ctx.request.query)
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

// 删除儿童
router.post('/deleteChild', async (ctx, next) => {
  const r = await mysql.deleteChild(ctx.request.query)
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
router.get('/downloadChildExcel', async (ctx, next) => {
  return ctx.body = await mysql.downloadChildExcel(ctx.request.query,ctx)
})


router.post('/changeClassFee', async (ctx, next) => {
  const r = await mysql.changeClassFee(ctx.request.query)
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
// router.get('/getMemberDetail', async (ctx, next) => {
//   const r = await mysql.getMemberDetail(ctx.request.query)
//   if(r.length > 0){
//     ctx.body = {
//       message: "success",
//       rows: r
//     }
//     return
//   }
//   ctx.body = {
//     message: "failed"
//   }
// })
// // 查询客户详情

module.exports = router
