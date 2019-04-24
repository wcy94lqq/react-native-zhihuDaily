import React, { Component } from "react";
import NetInfo from "@react-native-community/netinfo";

// 集成触底和上拉加载的滚动容器
import MyScrollView from "../../componetns/ScrollView";
// 日报列表组件
import StoriesList from "../../componetns/StoriesList";
import { Tools, Axios, Api } from "../../config";
export default class index extends Component {
  static navigationOptions = ({ navigation }) => {
    return {
      title: navigation.getParam("title")
    };
  };
  constructor(props) {
    super(props);
    let id = this.props.navigation.getParam("id") || null;
    let date = this.props.navigation.getParam("date") || null;
    let title = this.props.navigation.getParam("title") || null;
    this.state = {
      sectionId: id,
      date,
      pullUpLoading: false,
      stories: [] //栏目列表数据
    };
    this.props.navigation.setParams({ title });
  }
  componentDidMount() {
    // 根据参数区分加载 日报列表或栏目列表
    if (this.state.date) {
      this.initdaliyList();
    } else if (this.state.sectionId) {
      this.initSectionList();
    } else {
      Tools.toast("加载失败，错误信息：参数异常");
    }
  }
  initdaliyList() {
    storage
      .load({
        key: "before",
        id: this.state.date
      })
      .then(responseJson => {
        this.handleDataRender(responseJson, res => {
          let sectionData = [
            {
              key: responseJson.date,
              data: res
            }
          ];
          this.setState({
            stories: sectionData
          });
        });
      })
      .catch(error => {
        console.warn(error);
      });
  }
  initSectionList() {
    Tools.getNetworkState().then(newWorkInfo => {
      let syncInBackgroundState = !newWorkInfo.online;
      storage
        .load({
          key: "section",
          id: this.state.sectionId,
          syncInBackground: syncInBackgroundState
        })
        .then(responseJson => {
          this.handleDataRender(responseJson, res => {
            let sectionData = [
              {
                key: responseJson.timestamp,
                data: res
              }
            ];
            this.setState({
              stories: sectionData
            });
          });
        })
        .catch(error => {
          console.warn(error);
        });
    });
  }

  handleDataRender(responseJson, callback) {
    if (responseJson.stories) {
      this.updateVistedState(responseJson.stories, res => {
        callback(res);
      });
    } else {
      Tools.toast("加载失败，错误信息：数据格式异常");
    }
  }
  /*
   * 更新列表项访问状态
   * @param {Object} lsitData 列表数据对象
   * @param {Function} callback 回调函数
   */
  updateVistedState(listData, callback) {
    listData.map((item, index) => {
      storage
        .load({
          key: "visited",
          id: item.id
        })
        .then(res => {
          // 标记已访问
          item.visited = true;
          if (index === listData.length - 1) {
            callback(listData);
          }
        })
        // 未访问
        .catch(error => {
          item.visited = false;
          if (index === listData.length - 1) {
            callback(listData);
          }
        });
    });
  }
  /*
   * 监听列表项点击 跳转到详情页  记录点击状态
   * @param {Object} item 列表项
   */
  bindListTap = item => {
    // 页面跳转
    this.props.navigation.push("Details", {
      id: item.id
    });
    // 存储访问状态
    storage
      .save({
        key: "visited",
        id: item.id,
        data: true,
        expires: null
      })
      .then(() => {
        // 更新访问状态
        // PS：这里需要将旧数据解构成一个新数组 , 可以避免setState不生效问题，因为setState是浅比较 。
        let stories = [...this.state.stories];
        stories.forEach(items => {
          items.data.forEach(i => {
            if (i.id == item.id) {
              i.visited = true;
              return false;
            }
          });
        });
        this.setState({
          stories
        });
      });
  };
  pullupfresh = () => {
    //避免重复请求
    if (this.state.pullUpLoading) {
      return false;
    }
    this.setState({
      pullUpLoading: true
    });
    let date = this.state.stories[this.state.stories.length - 1].key;
    let apiUrl;
    if(this.state.date){
      apiUrl=`${Api.before}${date}`;
    }else{
      apiUrl=`${Api.section}${this.state.sectionId}/before/${date}`;
    }
    Axios.get(apiUrl)
      .then(responseJson => {
        this.handleDataRender(responseJson.data, res => {
          let data = [...this.state.stories];
          data.push({
            key: this.state.date?responseJson.data.date:responseJson.data.timestamp,
            data: res
          });
          this.setState({
            pullUpLoading: false,
            stories: data
          });
        });
      })
      .catch(err => {
        this.setState({
          pullUpLoading: false
        });
        console.warn(err);
      });
  };
  render() {
    return (
      <MyScrollView pullupfresh={this.pullupfresh}>
        <StoriesList data={this.state.stories} onPress={this.bindListTap} />
      </MyScrollView>
    );
  }
}
