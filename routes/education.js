const router = require('koa-router')()
const mysql = require('../lib/mysql.js')
let _ = require('underscore')
router.prefix('/api/education')

// 查询单条课程信息
router.get('/findOneClass', async (ctx, next) => {
  const r = await mysql.findOneClass(_.toArray(ctx.request.query))
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
// 查询课程列表
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

// 下载excel表格
router.get('/downloadExcel', async (ctx, next) => {
  return ctx.body = await mysql.downloadExcel(ctx.request.query,ctx)
})
module.exports = router

// 编辑表格信息
router.post('/editClass', async (ctx, next) => {
  const r = await mysql.editClass(ctx.request.query)
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

// 新建表格信息
router.post('/createClass', async (ctx, next) => {
  const r = await mysql.createClass(ctx.request.query)
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

// 删除课程信息
router.post('/deleteClass', async (ctx, next) => {
  const r = await mysql.deleteClass(ctx.request.query)
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