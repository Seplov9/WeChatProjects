const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 内容安全审核，返回 true 表示违规
const checkContent = async (content, scene, openid) => {
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content,
      version: 2,
      scene,
      openid,
    });
    return res.result.suggest !== "pass";
  } catch (e) {
    // API 不可用时放行（如个人主体无权限）
    return false;
  }
};

// 获取openid
const getOpenId = async () => {
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

// 获取小程序二维码
const getMiniProgramCode = async () => {
  const resp = await cloud.openapi.wxacode.get({
    path: "pages/index/index",
  });
  const { buffer } = resp;
  const upload = await cloud.uploadFile({
    cloudPath: "code.png",
    fileContent: buffer,
  });
  return upload.fileID;
};

// 获取手机号（个体工商户后可用）
const getPhoneNumber = async (event) => {
  try {
    const res = await cloud.openapi.phonenumber.getPhoneNumber({
      code: event.code,
    });
    return { success: true, phoneNumber: res.phoneInfo.phoneNumber };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 写入提交数据
const addUserData = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (await checkContent(event.content, 2, openid)) {
    return { success: false, errMsg: "内容不合规，请修改" };
  }

  try {
    await db.createCollection("users");
  } catch (e) {
    // 集合已存在则忽略
  }
  try {
    await db.collection("users").add({
      data: {
        type: "submission",
        userId: wxContext.OPENID,
        inputTime: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
        inputContent: event.content,
      },
    });
    return { success: true };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 查询提交数据
const getUserData = async () => {
  try {
    const result = await db
      .collection("users")
      .where({ type: "submission" })
      .orderBy("inputTime", "desc")
      .get();
    return { success: true, data: result.data };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 保存/更新用户信息
const saveUser = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (await checkContent(event.nickName, 1, openid)) {
    return { success: false, errMsg: "内容不合规，请修改" };
  }

  try {
    await db.createCollection("users");
  } catch (e) {
    // 集合已存在则忽略
  }

  try {
    const exist = await db.collection("users").where({ openid }).get();
    if (exist.data.length > 0) {
      await db.collection("users").doc(exist.data[0]._id).update({
        data: {
          nickName: event.nickName,
          avatarUrl: event.avatarUrl,
          updatedAt: new Date(),
        },
      });
    } else {
      await db.collection("users").add({
        data: {
          openid,
          nickName: event.nickName,
          avatarUrl: event.avatarUrl,
          phoneNumber: "",
          memberType: null,
          memberExpire: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
    return { success: true, openid };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 发布需求
const createOrder = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (await checkContent(event.title + " " + event.content, 2, openid)) {
    return { success: false, errMsg: "内容包含不合规信息，请修改后重新发布" };
  }

  try {
    await db.createCollection("orders");
  } catch (e) {
    // 集合已存在则忽略
  }

  try {
    await db.collection("orders").add({
      data: {
        publisherId: openid,
        publisherName: event.publisherName || "",
        publisherAvatar: event.publisherAvatar || "",
        category: event.category,
        title: event.title,
        content: event.content,
        reward: Number(event.reward) || 0,
        contact: event.contact || "",
        city: event.city || "",
        images: event.images || [],
        status: "active",
        boost: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return { success: true };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 撤销发布
const cancelOrder = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  try {
    const order = await db.collection("orders").doc(event.orderId).get();
    if (order.data.publisherId !== openid) {
      return { success: false, errMsg: "无权操作" };
    }
    await db.collection("orders").doc(event.orderId).update({
      data: { status: "closed", updatedAt: new Date() },
    });
    return { success: true };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 查询单个需求
const getOrderById = async (event) => {
  try {
    const result = await db.collection("orders").doc(event.orderId).get();
    return { success: true, data: result.data };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 更新需求
const updateOrder = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (await checkContent(event.title + " " + event.content, 2, openid)) {
    return { success: false, errMsg: "内容包含不合规信息，请修改后重新发布" };
  }

  try {
    const order = await db.collection("orders").doc(event.orderId).get();
    if (order.data.publisherId !== openid) {
      return { success: false, errMsg: "无权修改" };
    }
    await db.collection("orders").doc(event.orderId).update({
      data: {
        category: event.category,
        title: event.title,
        content: event.content,
        reward: Number(event.reward) || 0,
        contact: event.contact || "",
        city: event.city || "",
        images: event.images || [],
        updatedAt: new Date(),
      },
    });
    return { success: true };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 查询需求池
const getOrders = async () => {
  try {
    const result = await db
      .collection("orders")
      .where({ status: "active" })
      .orderBy("boost", "desc")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    return { success: true, data: result.data };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 查询我的发布
const getMyOrders = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  try {
    const result = await db
      .collection("orders")
      .where({ publisherId: openid })
      .orderBy("createdAt", "desc")
      .get();
    return { success: true, data: result.data };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 切换收藏
const toggleFavorite = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  try {
    await db.createCollection("favorites");
  } catch (e) {}
  try {
    const exist = await db
      .collection("favorites")
      .where({ userId: openid, orderId: event.orderId })
      .get();
    if (exist.data.length > 0) {
      await db.collection("favorites").doc(exist.data[0]._id).remove();
      return { success: true, favorited: false };
    }
    await db.collection("favorites").add({
      data: {
        userId: openid,
        orderId: event.orderId,
        orderSnapshot: event.orderSnapshot,
        createdAt: new Date(),
      },
    });
    return { success: true, favorited: true };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 获取收藏列表
const getFavorites = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  try {
    const result = await db
      .collection("favorites")
      .where({ userId: openid })
      .orderBy("createdAt", "desc")
      .get();
    return { success: true, data: result.data };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 记录浏览历史
const recordHistory = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  try {
    await db.createCollection("history");
  } catch (e) {}
  try {
    // 删除同 orderId 的旧记录
    const exist = await db
      .collection("history")
      .where({ userId: openid, orderId: event.orderId })
      .get();
    if (exist.data.length > 0) {
      await db.collection("history").doc(exist.data[0]._id).remove();
    }
    await db.collection("history").add({
      data: {
        userId: openid,
        orderId: event.orderId,
        orderSnapshot: event.orderSnapshot,
        viewedAt: new Date(),
      },
    });
    return { success: true };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 获取浏览历史
const getHistory = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  try {
    const result = await db
      .collection("history")
      .where({ userId: openid })
      .orderBy("viewedAt", "desc")
      .limit(50)
      .get();
    return { success: true, data: result.data };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case "getOpenId":
      return await getOpenId();
    case "getMiniProgramCode":
      return await getMiniProgramCode();
    case "getPhoneNumber":
      return await getPhoneNumber(event);
    case "addUserData":
      return await addUserData(event);
    case "getUserData":
      return await getUserData();
    case "saveUser":
      return await saveUser(event);
    case "createOrder":
      return await createOrder(event);
    case "getOrders":
      return await getOrders();
    case "getMyOrders":
      return await getMyOrders();
    case "toggleFavorite":
      return await toggleFavorite(event);
    case "getFavorites":
      return await getFavorites();
    case "recordHistory":
      return await recordHistory(event);
    case "getHistory":
      return await getHistory();
    case "getOrderById":
      return await getOrderById(event);
    case "updateOrder":
      return await updateOrder(event);
    case "cancelOrder":
      return await cancelOrder(event);
  }
};
