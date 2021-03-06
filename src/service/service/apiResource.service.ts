import {Injectable, Inject, Body, Query} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {InsertResult, Repository, UpdateResult} from 'typeorm';
import {System} from '../../model/entity/system.entity';
import {ApiResource} from '../../model/entity/apiResource.entity';
import {RoleApiResourceEntity} from '../../model/entity/roleApiResource.entity';
import {RedisCacheService} from './redisCache.service';
import {CreateApiResourceDto} from '../../model/DTO/apiResource/create_apiResource.dto';
import {MessageType, ResultData} from '../../common/result/ResultData';
import {UpdateApiResourceDto} from '../../model/DTO/apiResource/update_apiResource.dto';
import {QueryApiResourceDto} from '../../model/DTO/apiResource/query_apiResource.dto';
import {DeleteApiResourceDto} from '../../model/DTO/apiResource/delete_apiResource.dto';
import {formatDate} from '../../utils/data-time';
import {ApiException} from '../../common/error/exceptions/api.exception';
import {ApiErrorCode} from '../../config/api-error-code.enum';
import {Authority} from '../../model/entity/authority.entity';

@Injectable()
export class ApiResourceService {
    constructor(
        @InjectRepository(System) private readonly systemRepository: Repository<System>,
        @InjectRepository(ApiResource) private readonly apiResourceRepository: Repository<ApiResource>,
        @InjectRepository(RoleApiResourceEntity) private readonly roleApiResourceEntityRepository: Repository<RoleApiResourceEntity>,
        @Inject(RedisCacheService) private readonly redisCacheService: RedisCacheService,
    ) {
    }

    /**
     * 添加api资源
     * @param params
     */
    public async createApiResource(params: CreateApiResourceDto): Promise<InsertResult> {
        try {
            return await this.apiResourceRepository
                .createQueryBuilder('r')
                .insert()
                .into(ApiResource)
                .values([{
                    name: params.name,
                    code: params.code,
                    type: params.type,
                    system: params.system,
                    isDelete: 0,
                    module: params.module,
                    crateTime: formatDate(),
                    value: params.value ? params.value : '',
                    desc: params.desc,
                    parentId: params.parentId }])
                .execute();
        } catch (e) {
            console.log(e)
            throw new ApiException('操作成功', ApiErrorCode.ROLE_LIST_FAILED, 200);
        }

    }

    /**
     * 更新api资源
     * @param params
     */
    public async updateApiResource(params: UpdateApiResourceDto): Promise<UpdateResult> {
        try {
            return await this.apiResourceRepository
                .createQueryBuilder('r')
                .update(ApiResource)
                .set({
                    name: params.name,
                    code: params.code,
                    type: params.type,
                    system: params.system,
                    isDelete: 0,
                    module: params.module,
                    updateTime: formatDate(),
                    value: params.value ? params.value : '',
                    desc: params.desc,
                    parentId: params.parentId })
                .where('id = :id', { id: params.id })
                .execute();
        } catch (e) {
            throw new ApiException('操作成功', ApiErrorCode.ROLE_LIST_FAILED, 200);
        }
    }

    /**
     * 获取api列表
     * @param params
     */
    public async getApiList(params: QueryApiResourceDto): Promise<[ApiResource[], number]> {
        try {
            const queryConditionList = ['r.isDelete = :isDelete', 'r.type = :type'];
            if (params.name) {
                queryConditionList.push('r.name LIKE :name');
            }
            if (params.code) {
                queryConditionList.push('r.code LIKE :code');
            }
            if (params.system) {
                queryConditionList.push('r.system = :system');
            }
            if (params.module) {
                queryConditionList.push('r.module = :module');
            }
            const queryCondition = queryConditionList.join(' AND ');
            return  await this.apiResourceRepository
                .createQueryBuilder('r')
                .where(queryCondition, {
                    name: params.name,
                    code: params.code,
                    system: params.system,
                    module: params.module,
                    isDelete: 0,
                    type: 3,
                })
                .orderBy('r.system', 'ASC')
                .skip((params.page - 1) * params.pageSize)
                .take(params.pageSize)
                .getManyAndCount();
        } catch (e) {
            throw new ApiException('查询失败', ApiErrorCode.AUTHORITY_LIST_FILED, 200);
        }
    }

    /**
     * 获取系统列表
     */
    public async getSystemList(name: string): Promise<[ApiResource[], number]> {
        try {
            const queryConditionList = ['r.isDelete = :isDelete', 'r.type = :type' ];
            if (name) {
                queryConditionList.push('r.name = :name');
            }
            const queryCondition = queryConditionList.join(' AND ');
            return  await this.apiResourceRepository
                .createQueryBuilder('r')
                .where(queryCondition, {
                    type: 1,
                    isDelete: 0,
                    name,
                })
                .orderBy('r.system', 'ASC')
                .getManyAndCount();
        } catch (e) {
            throw new ApiException('查询失败', ApiErrorCode.AUTHORITY_LIST_FILED, 200);
        }
    }

    /**
     * 通过系统获取模块
     * @param system
     */
    public async getModuleBySystem(system: string): Promise<[ApiResource[], number]> {
        try {
            const queryConditionList = ['r.isDelete = :isDelete', 'r.type = :type'];
            if (system) {
                queryConditionList.push('r.system = :system');
            }
            const queryCondition = queryConditionList.join(' AND ');
            return  await this.apiResourceRepository
                .createQueryBuilder('r')
                .where(queryCondition, {
                    type: 2,
                    isDelete: 0,
                    system,
                })
                .orderBy('r.system', 'ASC')
                .getManyAndCount();
        } catch (e) {
            throw new ApiException('查询失败', ApiErrorCode.AUTHORITY_LIST_FILED, 200);
        }
    }

    /**
     * 删除资源'1: 系统， 2： 模块， 3： 接口'
     * @param params
     */
    public async deleteResource(params: DeleteApiResourceDto): Promise<UpdateResult> {
        try {
            const type: number = Number(params.type);
            switch (type) {
                case 3:
                    return await this.apiResourceRepository
                        .createQueryBuilder('r')
                        .update(ApiResource)
                        .set({isDelete: 1, deleteTime: formatDate()})
                        .whereInIds(params.ids)
                        .execute();
                    break;
                case 2:
                    return await this.apiResourceRepository
                        .createQueryBuilder('r')
                        .update(ApiResource)
                        .set({isDelete: 1, deleteTime: formatDate()})
                        .where({module: params.module})
                        .orWhereInIds(params.ids)
                        .execute();
                case 1:
                    return await this.apiResourceRepository
                        .createQueryBuilder('r')
                        .update(ApiResource)
                        .set({isDelete: 1, deleteTime: formatDate()})
                        .where({system: params.system})
                        .orWhereInIds(params.ids)
                        .execute();
                    break;
                default :
                    return null;
            }
        } catch (e) {
            console.log(e)
            throw new ApiException('操作失败', ApiErrorCode.AUTHORITY_DELETE_FILED, 200);
        }
    }

    /**
     * 系统资源唯一性
     * @param system
     */
    public async uniqueSystemCode(system: string): Promise<boolean> {
        try {
            const result = await this.apiResourceRepository.findOne({code: system});
            return !!!result;
        } catch (e) {
            throw new ApiException('操作失败', ApiErrorCode.AUTHORITY_DELETE_FILED, 200);
        }

    }

    /**
     * 模块资源唯一性
     * @param system
     * @param module
     */
    public async  uniqueModuleCode(moduleCode: string): Promise<boolean> {
        try {
            const result = await this.apiResourceRepository.findOne({code: moduleCode});
            return !!!result;
        } catch (e) {
            throw new ApiException('操作失败', ApiErrorCode.AUTHORITY_DELETE_FILED, 200);
        }
    }

    /**
     * api唯一性
     * @param system
     */
    public async uniqueApiCode(apicode: string): Promise<boolean> {
        try {
            const result = await this.apiResourceRepository.findOne({code: apicode});
            return !!!result;
        } catch (e) {
            throw new ApiException('操作失败', ApiErrorCode.AUTHORITY_DELETE_FILED, 200);
        }
    }
}
