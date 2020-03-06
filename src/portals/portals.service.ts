import { Injectable, HttpService } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PortalModel } from '../interfaces/portalModel.interface';
import { cleanModel } from '../helpers/helpers';

@Injectable()
export class PortalsService {

  constructor(
    @InjectModel('PortalModel') private readonly portalModel: Model<PortalModel>,
    private readonly httpService: HttpService
  ) {

  }

  async getPortals() {
    let portals = await this.portalModel.find();
    portals = portals.map(portal => {
      return {
        name: portal.name,
        host: portal.host,
        loginUrl: portal.loginUrl,
        activePage: portal.activePage,
        pages: portal.pages
      }
    })
    return portals;
  }

  async deletePortal(name) {
    let deleted = await this.portalModel.deleteOne({ name: name });
    return deleted;
  }

  // async getModel(portalName) {
  //   let portalModel = await this.portalModel.findOne({ name: portalName });
  //   return {
  //     name: portalModel.name,
  //     host: portalModel.host,
  //     activePage: portalModel.activePage,
  //     loginUrl: portalModel.loginUrl,
  //     pages: JSON.parse(portalModel.pages)
  //   };
  // }

  async getSimpleModel(portalName) {
    let portalModel = await this.portalModel.findOne({ name: portalName });
    let pages = portalModel.pages;
    let page = pages.find(page => page.name === portalModel.activePage);
    return page;
  }

  async syncPortalModel(portalName, portalUrl, loginUrl) {
    console.log('syncPortalMOdel');
    const login = await this.httpService.post(loginUrl, { username: 'admin', password: 'admin' }).toPromise();
    const result = await this.httpService.get(portalUrl + '/' + portalName + '.json', { headers: { Cookie: "Authorization=" + login.data.access_token } }).toPromise();
    let data = JSON.stringify(result.data).replace(/preferences/g, 'properties');

    let jsonData = JSON.parse(data);

    let newActivePage = null;

    if (jsonData.pages.length > 0) {
      let indexPage = jsonData.pages.find((page) => page.name === 'index');

      if (indexPage) {
        newActivePage = indexPage.name;
      }
      else {
        newActivePage = jsonData.pages[0].name;
      }
    }

    let model = await this.portalModel.findOneAndUpdate({ name: portalName }, {
      name: jsonData.name,
      host: portalUrl,
      loginUrl: loginUrl,
      pages: cleanModel(jsonData.pages),
      activePage: newActivePage
    }, { upsert: true, new: true });

    return {
      name: model.name,
      host: model.host,
      loginUrl: loginUrl,
      pages: model.pages,
      activePage: model.activePage
    }
  }

  async updatePortalModel(portalName, data) {
    let model = await this.portalModel.findOneAndUpdate({ name: portalName }, data, { new: true });
    return model;
  }


}