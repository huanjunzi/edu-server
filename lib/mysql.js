
const mysql = require('mysql')
const config = require('../config/default.js')
const _ = require('underscore')
const moment = require('moment')
const xl = require("excel4node")
const utils = require('../utils/utils.js')

// 创建数据库连接池
var pool  = mysql.createPool({
  host     : config.database.HOST,
  user     : config.database.USERNAME,
  password : config.database.PASSWORD,
  database : config.database.DATABASE
})
let query = ( sql, values ) => {
  return new Promise(( resolve, reject ) => {
    pool.getConnection(function(err, connection) {
      if (err) {
        return resolve( err )
      } else {
        console.log("_sql=",sql, "_values=",values)
        connection.query(sql, values, ( err, rows) => {
          if ( err ) {
            reject( err )
          } else {
            // nodejs连接MySQL返回的数据有RowDataPacket问题 需要转成json格式
            var dataString = JSON.stringify(rows);
            var data = JSON.parse(dataString)
            for (let d in data) {
              _.extend(data[d], {create_time : moment(data[d].create_time).format("YYYY-MM-DD hh:mm:ss")})
              _.extend(data[d], {update_time : moment(data[d].update_time).format("YYYY-MM-DD hh:mm:ss")})
              if(data[d].birthday) {
                _.extend(data[d], {birthday : moment(data[d].birthday).format("YYYY-MM-DD")})
              }
              if(data[d].entry_time) {
                _.extend(data[d], {entry_time : moment(data[d].entry_time).format("YYYY-MM-DD")})
              }
              if(data[d].dimission_time) {
                _.extend(data[d], {dimission_time : moment(data[d].dimission_time).format("YYYY-MM-DD")})
              }
              if(data[d].salary_time) {
                _.extend(data[d], {salary_time : moment(data[d].salary_time).format("YYYY-MM-DD")})
              }
            }
            resolve( data )
          }
          connection.release()
        })
      }
    })
  })

}

// 用户登录
let loginUser = async (values) => {
  let _sql = `SELECT * from edu_admin where username=? and pwd=? and deleted = 0`
  let result = await query( _sql, values)
  if(!_.isEmpty(result)) {
    updateLoginTime(result)
  }
  return result
}

// 登录成功后记录最后登录成功的时间
let updateLoginTime = async (values) => {
  for( let data of values){
    let arrStr = []
    arrStr.push(data.id, moment().format("YYYY-MM-DD hh:mm:ss"))
    let _sql = `INSERT INTO edu_admin (id,login_time) VALUES (?,?) ON DUPLICATE KEY UPDATE login_time=VALUES(login_time)`
    await query( _sql, arrStr)
  }
}

// 根据id查询单条课程信息
let findOneClass = (values) => {
  let _sql = `SELECT * from edu_class where id = ?`
  return query( _sql, values)
}
// 查询课程
let findClasses = (values) => {
  let {limit, offset, filter, search, params, timeRange, order} = values
  // '{"class_fee":["普通","加急"]}'
  let filterSql = '1=1'
  let searchSql = ''
  let paramsSql = ''
  let pageSql = ''
  let timeSql = ''
  let orderSql = ''
  if (filter !== '{}' && !_.isEmpty(filter)) {
    filterSql = ''
    filterSql = utils.filterValues(filter)
  }
  if(!_.isEmpty(offset) && +offset !== 0) {
    pageSql = ` limit ${limit}, ${offset}`
  }
  if (timeRange !== '["",""]' && timeRange !== '[]' && !_.isEmpty(timeRange)) {
    timeSql = utils.dataTimeValues(timeRange)
  }  
  if (params !== '{}' && !_.isEmpty(params)){
    paramsSql =' and ' + utils.filterValues(params)
  }
  if (search !== '{}' && !_.isEmpty(search)) {
    searchSql = utils.fuzzySearch(JSON.parse(search))
  }
  if (!_.isEmpty(order)) {
    orderSql = order
  }
  // let _sql = `SELECT * from edu_class t1 where ${filterSql}${searchSql}${paramsSql}${timeSql}${orderSql}${pageSql}`
  let _sql = `select *, ifnull(t2.count, 0) as count_class
  from edu_class t1
  left join
  (select class_id, count(class_id) as count from edu_parents_child join edu_child tt on tt.id = child_id and tt.deleted = 0 group by class_id) t2
  on t1.id = t2.class_id where ${filterSql}${searchSql}${paramsSql}${timeSql}${orderSql}${pageSql}`
  return query(_sql)
}

let downloadExcel = async (values, ctx) => {
  // nodejs连接MySQL返回的数据有RowDataPacket问题 需要转成json格式
  let r = await findClasses(values)
  var dataString = JSON.stringify(r)
  var data = JSON.parse(dataString)
  let wb = new xl.Workbook()
  let ws = wb.addWorksheet("Sheet 1")
  ws.cell(1, 1).string("课程名称")
  ws.cell(1, 2).string("课程费用")
  ws.cell(1, 3).string("课程描述")
  ws.cell(1, 4).string("创建时间")
  for (let i in data) {
    let index = +i + 2
    let row = data[i]
    // 第一个参数代表列 第二个代表行
    ws.cell(index, 1).string(row.class_name + '')
    ws.cell(index, 2).string(row.class_fee + '')
    ws.cell(index, 3).string(row.class_description + '')
    ws.cell(index, 4).string(row.create_time + '')
    // 设置列高度
    ws.row(+i + 2).setHeight(60)
  }
  // 设置行宽
  ws.column(1).setWidth(50)
  ws.column(2).setWidth(50)
  ws.column(3).setWidth(50)
  ws.column(4).setWidth(50)


  ctx.set('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  ctx.set('Character-Encoding', 'utf-8')
  let fileName = `课程项目${moment().format("YYYY-MM-DD hh:mm:ss")}`
  ctx.set("Content-Disposition", `attachments; filename=${encodeURIComponent(fileName)}.xlsx`)
  return wb.writeToBuffer()
}

// 批量编辑价格
let editClass = async (values) => {
  let { data, class_fee} = values
  data = JSON.parse(data)
  for (let d of data) {
    let arrStr = []
    arrStr.push(d.id , class_fee)
    let _sql = `INSERT INTO edu_class (id,class_fee) VALUES (?,?) ON DUPLICATE KEY UPDATE class_fee=VALUES(class_fee)`
    await query(_sql, arrStr)
  }
  return [{ success: 'success'}]

}

let createClass = async(values) => {
  let data = JSON.parse(values.data)
  let _sql = `INSERT INTO edu_class (class_name,class_fee, class_description) VALUES (?,?,?) ON DUPLICATE KEY UPDATE class_name=VALUES(class_name),class_fee=VALUES(class_fee),class_description=VALUES(class_description)`
  if(data && data.id) {
    _sql = `INSERT INTO edu_class (class_name,class_fee, class_description,id) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE class_name=VALUES(class_name),class_fee=VALUES(class_fee),class_description=VALUES(class_description)`
  }

  let arrStr = []
  for (let d in data) {
    arrStr.push(data[d])
  }
  // 这里设置class_name为unique 如果class_name有重复的情况 就会进行update的操作
  await query(_sql, arrStr)
  return [{ success: 'success'}]
}

let deleteClass = async(values) => {
  let data = JSON.parse(values.class_id)
  for (let d of data) {
    let arrStr = []
    arrStr.push(d.id,1)
    let _sql = `INSERT INTO edu_class (id,deleted) VALUES (?,?) ON DUPLICATE KEY UPDATE deleted=VALUES(deleted)`
    await query(_sql, arrStr)
  }

  return [{ success: 'success'}]

}

let findMember = (values) => {
  let { limit, offset, filter, order, timeRange, params , search} = values
  let pageSql = ''
  let timeSql = ''
  let filterSql = ' 1=1'
  let paramsSql = ''
  let searchSql = ''
  let orderSql = ''
  if (filter !== '{}' && !_.isEmpty(filter)) {
    filterSql = ''
    filterSql = utils.filterValues(filter)
  }
  if(!_.isEmpty(offset) && +offset !== 0) {
    pageSql = ` limit ${limit}, ${offset}`
  }
  if (timeRange !== '["",""]' && timeRange !== '[]' && !_.isEmpty(timeRange)) {
    timeSql = utils.dataTimeValues(timeRange)
  }  
  if (params !== '{}' && !_.isEmpty(params)){
    paramsSql =' and ' + utils.filterValues(params)
  }
  if (search !== '{}' && !_.isEmpty(search)) {
    searchSql = utils.fuzzySearch(JSON.parse(search))
  }
  if (!_.isEmpty(order)) {
    orderSql = order
  }
  // const _sql = `SELECT * from edu_member t1 where ${filterSql}${paramsSql}${pageSql}${searchSql}${timeSql}${orderSql}`
  const _sql = `
  select *, ifnull(t2.count, 0) as count_member
  from edu_member t1
  left join
  (select member_id, count(member_id) as count from edu_parents_child join edu_child tt on tt.id = child_id and tt.deleted = 0 group by member_id) t2
  on t1.id = t2.member_id where ${filterSql}${paramsSql}${searchSql}${timeSql}${orderSql}${pageSql}`
  return query(_sql)
}

let editMember = async (values) => {
  let { data } = values
  data = JSON.parse(data)
  for (let d of data) {
    let _sql = `INSERT INTO edu_member (name, parents, age, tel_phone, customer_type,second_name,second_parents,second_tel_phone,second_age,purpose,social_soft,remark,province,city,district,address) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),parents=VALUES(parents),age=VALUES(age),tel_phone=VALUES(tel_phone),customer_type=VALUES(customer_type),second_name=VALUES(second_name),second_parents=VALUES(second_parents),second_tel_phone=VALUES(second_tel_phone),second_age=VALUES(second_age),purpose=VALUES(purpose),social_soft=VALUES(social_soft),remark=VALUES(remark),province=VALUES(province),city=VALUES(city),district=VALUES(district),address=VALUES(address)`
    let arrStr = []
    arrStr.push( d.name, d.parents, d.age, d.tel_phone, d.customer_type,d.second_name,d.second_parents, d.second_tel_phone, d.second_age, d.purpose, d.social_soft, d.remark, d.province,d.city, d.district, d.address)
    if(d.id){
      arrStr.push(d.id)
      _sql = `INSERT INTO edu_member (name, parents, age, tel_phone, customer_type,second_name,second_parents,second_tel_phone, second_age,purpose,social_soft,remark,province, city,district, address, id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),parents=VALUES(parents),age=VALUES(age),tel_phone=VALUES(tel_phone),customer_type=VALUES(customer_type),second_name=VALUES(second_name),second_parents=VALUES(second_parents),second_tel_phone=VALUES(second_tel_phone),second_age=VALUES(second_age),purpose=VALUES(purpose),social_soft=VALUES(social_soft),remark=VALUES(remark),province=VALUES(province),city=VALUES(city),district=VALUES(district),address=VALUES(address)`
    }
    // console.log("arrStr==", arrStr, "sql_", _sql)
    await query(_sql, arrStr)
  }
  return [{ success: 'success'}]
}

let deleteMember = async(values) => {
  let data = JSON.parse(values.member_id) 
  for (let d of data) {
    let arrStr = []
    arrStr.push(d.id,1)
    let _sql = `INSERT INTO edu_member (id,deleted) VALUES (?,?) ON DUPLICATE KEY UPDATE deleted=VALUES(deleted)`
    await query(_sql, arrStr)
  }
  return [{ success: 'success'}]
}

// 下载会员信息的Excel
let downloadMemberExcel = async (values, ctx) => {
  // nodejs连接MySQL返回的数据有RowDataPacket问题 需要转成json格式
  let r = await findMember(values)
  let dataString = JSON.stringify(r)
  let data = JSON.parse(dataString)
  let customer = ""
  let wb = new xl.Workbook()
  let ws = wb.addWorksheet("Sheet 1")
  ws.cell(1, 1).string("家长姓名")
  ws.cell(1, 2).string("家长称呼")
  ws.cell(1, 3).string("家长年纪")
  ws.cell(1, 4).string("手机号")
  ws.cell(1, 5).string("家庭住址")
  ws.cell(1, 6).string("客户类型")
  ws.cell(1, 7).string("孩子数量")
  ws.cell(1, 8).string("沟通次数")
  ws.cell(1, 9).string("创建时间")

  for (let i in data) {
    let index = +i + 2
    let row = data[i]
    // 第一个参数代表列 第二个代表行
    ws.cell(index, 1).string(row.name + '')
    ws.cell(index, 2).string(row.parents + '')
    ws.cell(index, 3).string(row.age + '')
    ws.cell(index, 4).string(row.tel_phone + '')
    ws.cell(index, 5).string(row.province + row.city + row.district + row.address + '')

    customer = row.customer_type === '0' ? "非潜在客户" : row.customer_type === "1" ? "潜在客户" : "会员"
    ws.cell(index, 6).string(customer + '')
    ws.cell(index, 7).string(row.child_count + '')
    ws.cell(index, 8).string(row.contact_count + '')
    ws.cell(index, 9).string(row.create_time + '')

    // 设置列高度
    ws.row(+i + 2).setHeight(60)
  }
  // 设置行宽
  ws.column(1).setWidth(20)
  ws.column(2).setWidth(20)
  ws.column(3).setWidth(20)
  ws.column(4).setWidth(20)
  ws.column(5).setWidth(50)
  ws.column(6).setWidth(20)
  ws.column(7).setWidth(20)
  ws.column(8).setWidth(20)
  ws.column(9).setWidth(20)

  ctx.set('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  ctx.set('Character-Encoding', 'utf-8')
  let fileName = `家长管理${moment().format("YYYY-MM-DD hhmmss")}`
  ctx.set("Content-Disposition", `attachments; filename=${encodeURIComponent(fileName)}.xlsx`)
  return wb.writeToBuffer()
}
// 查询会员详情
let getMemberDetail = async (values) => {
  let {data} = values
  let _sqlChilds = `SELECT t3.* from edu_member t1 left join edu_parents_child t2 on t1.id = t2.member_id left join edu_child t3 on t3.id = t2.child_id 
  where t1.id = ${data} and t1.deleted = 0 and t3.deleted = 0`
  let _sqlParent = `SELECT t1.* from edu_member t1 where t1.id = ${data} and t1.deleted = 0`
  let childs = await query(_sqlChilds)
  let parent = await query(_sqlParent)
  return [{childs: childs},{ parent: parent}]
}
// 修改电话沟通次数
let changeContactCount = async (values) => {
  let { id, count } = values
  let arrStr = []
  arrStr.push(id , count)
  let _sql = `INSERT INTO edu_member (id, contact_count) VALUES (?,?) ON DUPLICATE KEY UPDATE contact_count=VALUES(contact_count)`
  await query(_sql, arrStr)
  return [{ success: 'success'}]
}
// SELECT child.*, class.class_name, member.name as member_name
// from (
//   select a.*, b.class_id, b.member_id from  edu_child a join edu_parents_child b on a.id = b.child_id
//   ) child left join edu_class class on class.id = child.class_id 
//   left join edu_member member on member.id = child.member_id
// 查看孩子列表
let findChild = async (values) => {
  let { limit, offset, filter, order, timeRange, params , search} = values
  let pageSql = ''
  let timeSql = ''
  let filterSql = ' 1=1'
  let paramsSql = ''
  let searchSql = ''
  let orderSql = ''
  if (filter !== '{}' && !_.isEmpty(filter)) {
    filterSql = ''
    filterSql = utils.filterValues(filter)
  }
  if(!_.isEmpty(offset) && +offset !== 0) {
    pageSql = ` limit ${limit}, ${offset}`
  }
  if (timeRange !== '["",""]' && timeRange !== '[]' && !_.isEmpty(timeRange)) {
    timeSql = utils.dataTimeValues(timeRange)
  }  
  if (params !== '{}' && !_.isEmpty(params)){
    paramsSql =' and ' + utils.filterValues(params)
  }
  if (search !== '{}' && !_.isEmpty(search)) {
    searchSql = utils.fuzzySearch(JSON.parse(search))
  }
  if (!_.isEmpty(order)) {
    orderSql = order
  }
  const _sql = `SELECT t1.*, class.class_name, member.name as member_name,member.tel_phone
  from (
  select a.*, b.id as pc_id,b.class_id, b.member_id from  edu_child a join edu_parents_child b on a.id = b.child_id
  ) t1 left join edu_class class on class.id = t1.class_id 
  left join edu_member member on member.id = t1.member_id where ${filterSql}${paramsSql}${searchSql}${timeSql}${orderSql}${pageSql}`
  let result = await query(_sql)
  console.log(result)
  result.map(i => i._locked = true)
  return result
}
// 下载儿童信息的Excel
let downloadChildExcel = async (values, ctx) => {
  // nodejs连接MySQL返回的数据有RowDataPacket问题 需要转成json格式
  let r = await findChild(values)
  let dataString = JSON.stringify(r)
  let data = JSON.parse(dataString)
  let member_type = ""
  let sex = ""
  let wb = new xl.Workbook()
  let ws = wb.addWorksheet("Sheet 1")
  ws.cell(1, 1).string("儿童姓名")
  ws.cell(1, 2).string("所属家长")
  ws.cell(1, 3).string("家长电话")
  ws.cell(1, 4).string("儿童性别")
  ws.cell(1, 5).string("儿童年龄")
  ws.cell(1, 6).string("儿童生日")
  ws.cell(1, 7).string("儿童特点")
  ws.cell(1, 8).string("所报课程")
  ws.cell(1, 9).string("最终支付费用")
  ws.cell(1, 10).string("会员状态")
  ws.cell(1, 11).string("创建时间")

  for (let i in data) {
    let index = +i + 2
    let row = data[i]
    // 第一个参数代表列 第二个代表行
    ws.cell(index, 1).string(row.child_name + '')
    ws.cell(index, 2).string(row.member_name + '')
    ws.cell(index, 3).string(row.tel_phone + '')
    sex = row.sex === '0' ? "男" : "女"
    ws.cell(index, 4).string(sex + '')
    ws.cell(index, 5).string(row.age + '')
    ws.cell(index, 6).string(row.birthday + '')
    ws.cell(index, 7).string(row.specialty + '')
    ws.cell(index, 8).string(row.class_name + '')
    ws.cell(index, 9).string(row.final_fee + '')
    member_type = +row.member_status === 0 ? "非会员" : +row.member_status === 1 ? "会员" : "过期会员"
    ws.cell(index, 10).string(member_type + '')
    ws.cell(index, 11).string(row.create_time + '')
    // 设置列高度
    ws.row(+i + 2).setHeight(60)
  }
  ws.row(1).setHeight(80)
  // 设置行宽
  ws.column(1).setWidth(20)
  ws.column(2).setWidth(20)
  ws.column(3).setWidth(20)
  ws.column(4).setWidth(20)
  ws.column(5).setWidth(20)
  ws.column(6).setWidth(20)
  ws.column(7).setWidth(20)
  ws.column(8).setWidth(20)
  ws.column(9).setWidth(20)
  ws.column(10).setWidth(20)
  ws.column(11).setWidth(20)
  ctx.set('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  ctx.set('Character-Encoding', 'utf-8')
  let fileName = `儿童管理${moment().format("YYYY-MM-DD hhmmss")}`
  ctx.set("Content-Disposition", `attachments; filename=${encodeURIComponent(fileName)}.xlsx`)
  return wb.writeToBuffer()
}
// select *, ifnull(b.count, 0) from edu_member a left join (select *, count(member_id) as count from edu_parents_child group by member_id) b on a.id = b.member_id
// 创建或编辑儿童信息
let editChild = async (values) => {
  let _sqlA = ''
  let _sqlB = ''
  let _sqlC = ''
  let _sqlD = ''
  let arrStrC = []
  let {data} = values
  data = JSON.parse(data)
  let arrStrA = []
  let arrStrB = []
  let childResult = ""
  for (let d of data) {
    !_.isEmpty(d.birthday) ? d.birthday = moment(d.birthday).format("YYYY-MM-DD") : d.birthday = null
    arrStrA.push(d.child_name,d.sex,d.age,d.specialty,d.birthday,d.member_status)
    
    if(d.id) {
      arrStrA.push(d.id)
      _sqlA = `INSERT INTO edu_child (child_name,sex,age,specialty,birthday,member_status,id) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE child_name=VALUES(child_name),sex=VALUES(sex),age=VALUES(age),specialty=VALUES(specialty),birthday=VALUES(birthday),member_status=VALUES(member_status)`
    } else {
      _sqlA = `INSERT INTO edu_child (child_name,sex,age,specialty,birthday,member_status) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE child_name=VALUES(child_name),sex=VALUES(sex),age=VALUES(age),specialty=VALUES(specialty),birthday=VALUES(birthday),member_status=VALUES(member_status)`
      }
    childResult = await query(_sqlA, arrStrA)

    d.class_id = d.class_id ? d.class_id : null
    let childId = ''
    if( childResult.insertId > 0 ){
     childId = childResult.insertId
    } else {
     childId = d.id
    }
    // 只处理是会员的情况
    // 是会员并且选择了课程
    if(d.class_id && +d.member_status === 1) {
      _sqlC = `SELECT class_fee from edu_class where id = ${d.class_id} and deleted = 0`
     let classResult = await query(_sqlC)
     arrStrC = [ classResult[0].class_fee, childId ]
     _sqlD = `INSERT INTO edu_child (final_fee,id) VALUES (?,?) ON DUPLICATE KEY UPDATE final_fee=VALUES(final_fee)`
     await query(_sqlD, arrStrC)
    } 
    // 是会员 取消了课程
    else if(!d.class_id && +d.member_status === 1) {
      arrStrC = [ 0, childId ]
      _sqlD = `INSERT INTO edu_child (final_fee,id) VALUES (?,?) ON DUPLICATE KEY UPDATE final_fee=VALUES(final_fee)`
      await query(_sqlD, arrStrC)
    }


    // 如果是insert
    if(childResult && +childResult.insertId > 0) {
      arrStrB.push(d.member_id, childResult.insertId, d.class_id)
    } else {
      arrStrB.push(d.member_id, d.id, d.class_id)
    }
    if(d.pc_id){
      arrStrB.push(d.pc_id)
      _sqlB = `INSERT INTO edu_parents_child (member_id,child_id,class_id,id) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE member_id=VALUES(member_id),child_id=VALUES(child_id),class_id=VALUES(class_id)`
    } else {
      _sqlB = `INSERT INTO edu_parents_child (member_id,child_id,class_id) VALUES (?,?,?) ON DUPLICATE KEY UPDATE member_id=VALUES(member_id),child_id=VALUES(child_id),class_id=VALUES(class_id)`
    }
    await query(_sqlB, arrStrB)
  }
  return [{ success: 'success'}]
}

let deleteChild = async(values) => {
  let data = JSON.parse(values.child_id) 
  for (let d of data) {
    let arrStr = []
    arrStr.push(d.id,1)
    let _sql = `INSERT INTO edu_child (id,deleted) VALUES (?,?) ON DUPLICATE KEY UPDATE deleted=VALUES(deleted)`
    await query(_sql, arrStr)
  }
  return [{ success: 'success'}]
}

// 修改电话沟通次数
let changeClassFee = async (values) => {
  let { id, count } = values
  let arrStr = []
  arrStr.push(id , count)
  let _sql = `INSERT INTO edu_child (id, final_fee) VALUES (?,?) ON DUPLICATE KEY UPDATE final_fee=VALUES(final_fee)`
  await query(_sql, arrStr)
  return [{ success: 'success'}]
}

// 查询儿童详情
let getChildDetail =  (values) => {
  let {data} = values
  let _sql = ` select t1.*,t2.name,t2.tel_phone,t2.second_name,t2.second_tel_phone,t3.class_name,t3.class_fee,t3.class_description from 
  ( select a.*, b.id as pc_id,b.class_id, b.member_id from  edu_child a join edu_parents_child b on a.id = b.child_id and b.child_id = ${data}) t1
  left join edu_member t2 on t1.member_id = t2.id 
  left join edu_class t3 on t1.class_id = t3.id where t1.deleted = 0`
  return query(_sql)
}

// 查询员工
let findStaff = (values) => {
  let {limit, offset, filter, search, params, timeRange, order} = values
  // '{"class_fee":["普通","加急"]}'
  let filterSql = '1=1'
  let searchSql = ''
  let paramsSql = ''
  let pageSql = ''
  let timeSql = ''
  let orderSql = ''
  if (filter !== '{}' && !_.isEmpty(filter)) {
    filterSql = ''
    filterSql = utils.filterValues(filter)
  }
  if(!_.isEmpty(offset) && +offset !== 0) {
    pageSql = ` limit ${limit}, ${offset}`
  }
  if (timeRange !== '["",""]' && timeRange !== '[]' && !_.isEmpty(timeRange)) {
    timeSql = utils.dataTimeValues(timeRange)
  }  
  if (params !== '{}' && !_.isEmpty(params)){
    paramsSql =' and ' + utils.filterValues(params)
  }
  if (search !== '{}' && !_.isEmpty(search)) {
    searchSql = utils.fuzzySearch(JSON.parse(search))
  }
  if (!_.isEmpty(order)) {
    orderSql = order
  }
  let _sql = `select * from edu_staff t1 where ${filterSql}${searchSql}${paramsSql}${timeSql}${orderSql}${pageSql}`
  return query(_sql)
}

// 删除员工
let deleteStaff = async(values) => {
  let _sqlA = ''
  let data = JSON.parse(values.staff_id)
  for (let d of data) {
    let arrStr = []
    arrStr.push(d.id,1)
    let _sql = `INSERT INTO edu_staff (id,deleted) VALUES (?,?) ON DUPLICATE KEY UPDATE deleted=VALUES(deleted)`
    await query(_sql, arrStr)

    _sqlA = `UPDATE edu_staff_salary SET deleted = 1 WHERE staff_id = ${d.id}`
    await query(_sqlA)
  }


  return [{ success: 'success'}]
}

// 新建或编辑员工
let editStaff = async (values) => {
  let { data } = values
  data = JSON.parse(data)
  for (let d of data) {
    !_.isEmpty(d.dimission_time) ? d.dimission_time = moment(d.dimission_time).format("YYYY-MM-DD") : d.dimission_time = null
    d.entry_time = moment(d.entry_time).format("YYYY-MM-DD")
    let arrStr = []
    arrStr.push( d.staff_name, d.staff_age, d.staff_sex, d.staff_tel_phone, d.staff_type,d.staff_online,d.staff_salary,d.entry_time,d.dimission_time)
    let _sql = `INSERT INTO edu_staff (staff_name, staff_age, staff_sex, staff_tel_phone, staff_type,staff_online,staff_salary,entry_time,dimission_time) VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE staff_name=VALUES(staff_name),staff_age=VALUES(staff_age),staff_sex=VALUES(staff_sex),staff_tel_phone=VALUES(staff_tel_phone),staff_type=VALUES(staff_type),staff_online=VALUES(staff_online),staff_salary=VALUES(staff_salary),entry_time=VALUES(entry_time),dimission_time=VALUES(dimission_time)`
    if(d.id){
      arrStr.push(d.id)
      _sql = `INSERT INTO edu_staff (staff_name, staff_age, staff_sex, staff_tel_phone, staff_type,staff_online,staff_salary,entry_time,dimission_time,id) VALUES (?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE staff_name=VALUES(staff_name),staff_age=VALUES(staff_age),staff_sex=VALUES(staff_sex),staff_tel_phone=VALUES(staff_tel_phone),staff_type=VALUES(staff_type),staff_online=VALUES(staff_online),staff_salary=VALUES(staff_salary),entry_time=VALUES(entry_time),dimission_time=VALUES(dimission_time)`
    }
    // // console.log("arrStr==", arrStr, "sql_", _sql)
    await query(_sql, arrStr)
  }
    return [{ success: 'success'}]
}

// 查询员工详情
let getStaffDetail =  (values) => {
  let {data} = values
  let _sql = `select * from edu_staff t1 where t1.id = ${data} and t1.deleted = 0`
  return query(_sql)
}

// 查询薪资
let findSalary = (values) => {
  let {limit, offset, filter, search, params, timeRange, order} = values
  let filterSql = '1=1'
  let searchSql = ''
  let paramsSql = ''
  let pageSql = ''
  let timeSql = ''
  let orderSql = ''
  if (filter !== '{}' && !_.isEmpty(filter)) {
    filterSql = ''
    filterSql = utils.filterValues(filter)
  }
  if(!_.isEmpty(offset) && +offset !== 0) {
    pageSql = ` limit ${limit}, ${offset}`
  }
  if (timeRange !== '["",""]' && timeRange !== '[]' && !_.isEmpty(timeRange)) {
    timeSql = utils.dataTimeValues(timeRange)
  }  
  if (params !== '{}' && !_.isEmpty(params)){
    paramsSql =' and ' + utils.filterValues(params)
  }
  if (search !== '{}' && !_.isEmpty(search)) {
    searchSql = utils.fuzzySearch(JSON.parse(search))
  }
  if (!_.isEmpty(order)) {
    orderSql = order
  }
  let _sql = `select t1.* from edu_staff_salary t1, edu_staff t2 where ${filterSql}${searchSql}${paramsSql}${timeSql} and t1.staff_id = t2.id ${orderSql}${pageSql}`
  return query(_sql)
}

// 创建或编辑工资条
let editSalary = async (values) => {
  let _sql = ''
  let _sqlA = ''
  let _sqlB = ''
  let { data } = values
  data = JSON.parse(data)
  for (let d of data) {
    d.salary_time = moment(d.salary_time).format("YYYY-MM-DD")
    let arrStr = []
    arrStr.push( d.salary, d.salary_time, d.remark, d.staff_id)
    _sql = `INSERT INTO edu_staff_salary (salary, salary_time, remark, staff_id) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE salary=VALUES(salary),salary_time=VALUES(salary_time),remark=VALUES(remark),staff_id=VALUES(staff_id)`
    if(d.id){
      arrStr.push(d.id)
      _sql = `INSERT INTO edu_staff_salary (salary, salary_time, remark, staff_id, id) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE salary=VALUES(salary),salary_time=VALUES(salary_time),remark=VALUES(remark),staff_id=VALUES(staff_id)`
    }
    let resultSalary = await query(_sql, arrStr)
    _sqlA = `SELECT id FROM edu_staff_salary where deleted = 0 ORDER BY id DESC LIMIT 1`
    let resultNew = await query(_sqlA)
    // 查询最新一条记录 和 当前更新的记录作对比 如果匹配成功就更新员工信息
    if(+resultSalary.insertId > 0 && +resultSalary.insertId === +resultNew[0].id) {
      let arrStrA = [ d.salary_time + ' ' + d.salary + '/月', d.staff_id ]
      _sqlB = `INSERT INTO edu_staff (staff_last_salary, id) VALUES (?,?) ON DUPLICATE KEY UPDATE staff_last_salary=VALUES(staff_last_salary)`
      await query(_sqlB, arrStrA)
    }

    // // console.log("arrStr==", arrStr, "sql_", _sql)
 
  }
    return [{ success: 'success'}]
}

// 删除工资条
let deleteSalary = async(values) => {
  let _sqlA = ''
  let _sqlB = ''
  let arrStrA = []
  let data = JSON.parse(values.id)
  let {staff_id} =values
  for (let d of data) {
    let arrStr = []
    arrStr.push(d.id,1,staff_id)
    let _sql = `INSERT INTO edu_staff_salary (id,deleted,staff_id) VALUES (?,?,?) ON DUPLICATE KEY UPDATE deleted=VALUES(deleted),staff_id=VALUES(staff_id)`
    await query(_sql, arrStr)
  }
  _sqlA = `SELECT id,salary,salary_time FROM edu_staff_salary where deleted = 0 ORDER BY id DESC LIMIT 1`
  let resultNew = await query(_sqlA)
  if(!_.isEmpty(resultNew)) {
    let newStaff_id = resultNew[0].id
    let newSalary = resultNew[0].salary
    let newSalary_time = resultNew[0].salary_time
    arrStrA = [ newSalary_time + ' ' + newSalary + '/月', newStaff_id ]
  } else {
    arrStrA = ['', staff_id ]
  }
  _sqlB = `INSERT INTO edu_staff (staff_last_salary, id) VALUES (?,?) ON DUPLICATE KEY UPDATE staff_last_salary=VALUES(staff_last_salary)`
  await query(_sqlB, arrStrA)

  return [{ success: 'success'}]
}

module.exports = {
  loginUser,
  findClasses,
  downloadExcel,
  editClass,
  createClass,
  deleteClass,
  findOneClass,
  findMember,
  editMember,
  deleteMember,
  downloadMemberExcel,
  getMemberDetail,
  findChild,
  changeContactCount,
  downloadChildExcel,
  editChild,
  deleteChild,
  changeClassFee,
  getChildDetail,
  findStaff,
  deleteStaff,
  editStaff,
  getStaffDetail,
  findSalary,
  editSalary,
  deleteSalary,
}