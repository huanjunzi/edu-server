const router = require('koa-router')()
const mysql = require('../lib/mysql.js')
let _ = require('underscore')
router.prefix('/api/staff')

router.get('/findStaff', async (ctx,next) => {
  console.log(ctx.request.query)
  const r = await mysql.findStaff(ctx.request.query)
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

// 删除员工
router.post('/deleteStaff', async (ctx, next) => {
  const r = await mysql.deleteStaff(ctx.request.query)
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

// 创建或编辑员工
router.post('/editStaff', async (ctx, next) => {
  const r = await mysql.editStaff(ctx.request.query)
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

// 查看员工详情
router.get('/getStaffDetail', async (ctx, next) => {
  const r = await mysql.getStaffDetail(ctx.request.query)
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

// 查找员工工资
router.get('/findSalary', async (ctx,next) => {
  const r = await mysql.findSalary(ctx.request.query)
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

// 创建或编辑工资条
router.post('/editSalary', async (ctx, next) => {
  const r = await mysql.editSalary(ctx.request.query)
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

// 删除工资条
router.post('/deleteSalary', async (ctx, next) => {
  const r = await mysql.deleteSalary(ctx.request.query)
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
module.exports = router
