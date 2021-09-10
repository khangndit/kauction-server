const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const dataFake = require('./dataFake.js');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

const io = socketio(server, {
  cors: {
    origin: '*',
  },
});

const PRICE_INIT = 1000;
let dataCurrent = [];

const generateTimer = (dataList) => {
  setInterval(() => {
    const result = dataList.map((el) => {
      if (el.timer != 0) {
        el.timer = el.timer - 1;
      }
      return el;
    });
    dataCurrent = result;
  }, 1000);
};
generateTimer(dataFake.map((el) => Object.assign({}, el)));

io.on('connection', (socket) => {
  console.log('Socket io has connection with ID is:', socket.id);

  socket.on('ON_GET_DATA_CURRENT', () => {
    socket.emit('EMIT_DATA_CURRENT', dataCurrent);
  });

  socket.on('ON_RESET_PRODUCT_BY_ID', (id) => {
    handleResetProductById(id);
    io.sockets.emit('EMIT_DATA_CURRENT', dataCurrent);

    const productDtl = getProductById(id);
    // room is id
    const room = 'room' + id;
    io.to(room).emit('EMIT_GET_PRODUCT_DTL', productDtl);
  });

  socket.on('ON_GET_DATA_BY_ID', (id) => {
    const data = getProductById(id);
    socket.emit('EMIT_GET_DATA_BY_ID', data);
  });

  socket.on('ON_CHANGE_PRICE_BY_ID', (dataObj) => {
    const { id, price } = dataObj;
    updatePriceProductById(id, price);
    io.sockets.emit('EMIT_DATA_CURRENT', dataCurrent);
  });

  socket.on('JOIN', (room) => {
    // console.log('JOIN ROOM: ', room);
    socket.join(room);
  });

  socket.on('LEAVE_ROOM', (room) => {
    // console.log('LEAVE_ROOM: ', room);
    socket.leave(room);
  });

  socket.on('ON_GET_PRODUCT_DTL', (dataObj) => {
    const { id, room } = dataObj;
    const productDtl = getProductById(id);
    io.to(room).emit('EMIT_GET_PRODUCT_DTL', productDtl);
  });

  socket.on('ON_SEND_INFO_AUCTION', (dataObj) => {
    const productDtl = addAuctionProductById(dataObj);
    const { room, user } = dataObj;

    io.to(room).emit('EMIT_INFO_AUCTION', {
      data: productDtl,
      message: `Giá thầu đã được thay đổi bởi ${user}`,
    });
  });

  socket.on('disconnect', () => {
    console.log('Socket io has disconnect!!!');
  });
});

const addAuctionProductById = (dataObj) => {
  let result = null;
  dataCurrent.forEach((el) => {
    if (el.id === dataObj.id) {
      el.historyAuction.unshift({
        name: dataObj.user,
        price: dataObj.price,
        option: dataObj.option,
        count: 1,
        timestamp: dataObj.timestamp,
      });
      //create key
      el.historyAuction.forEach((item, index) => {
        item.key = index;
      });
      result = el;
    }
  });
  return result;
};

const getProductById = (id) => {
  return dataCurrent.find((el) => el.id === id);
};

const updatePriceProductById = (id, price) => {
  dataCurrent.forEach((el) => {
    if (el.id === id) {
      el.priceCurrent = price;
    }
  });
};

// const resetProductPrice = (id) => {
//   dataCurrent.forEach((el) => {
//     if (el.id === id) {
//       el.priceCurrent = 1000;
//     }
//   });
// };

const handleResetProductById = (id) => {
  dataCurrent.forEach((el) => {
    if (el.id === +id) {
      const dataFakeTemp = dataFake.find((item) => item.id === el.id);
      if (dataFakeTemp) {
        el.timer = dataFakeTemp.timer;
        el.priceCurrent = PRICE_INIT;
        el.historyAuction = [];
      }
    }
  });
};

server.listen(PORT, () => console.log(`Server has started with port ${PORT}`));
