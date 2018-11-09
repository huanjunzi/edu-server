
const _ = require('underscore')

// 处理filter参数 拼接sql
let filterValues = (values)  => {
  let filterSql = ''
  let filter = JSON.parse(values)
  _.map(filter, function(value, key) {
    return filterSql += `${key} in (${value.map(v => `'${v}'` ).join(',')}) and `
  })
  // 去除最后一个and字符串
  filterSql=filterSql.substr(0, filterSql.length-4)
  return filterSql
}
// 处理搜索参数
let searchValues = (values) => {
  let searchSql = ''
  let searchValue = JSON.parse(values)
  for (key in searchValue) {
    searchSql = ` and ${key} like '%${searchValue[key]}%'`
  }
  return searchSql
}
 // 处理对象参数
let paramsValues = (values) => {
  let paramsSql = ''
  let paramsValue = JSON.parse(values)
    for (key in paramsValue) {
      console.log(key, paramsValue[key])
      paramsSql += ` and ${key} in ('${paramsValue[key]}')`
    }
  return paramsSql
}

// 处理filter参数 拼接sql
let dataTimeValues = (values)  => {
  let timeSql = ''
  let time = JSON.parse(values)
  let beginTime = time[0]
  let endTime = time[1]
  timeSql = ` and create_time BETWEEN '${beginTime} 00:00:00' and '${endTime} 23:59:59'`
  
  // 去除最后一个and字符串
  return timeSql
}

module.exports = {
  filterValues,
  searchValues,
  paramsValues,
  dataTimeValues,
}