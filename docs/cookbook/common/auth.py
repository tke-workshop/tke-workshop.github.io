#!/usr/bin/env python3
"""
认证工具模块
管理腾讯云 API 认证和客户端创建
"""

import yaml
from pathlib import Path
from typing import Dict, Any
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tke.v20180525 import tke_client
from tencentcloud.cvm.v20170312 import cvm_client

def load_config(config_path: str = "config.yaml") -> Dict[str, Any]:
    """
    加载配置文件
    
    Args:
        config_path: 配置文件路径
    
    Returns:
        配置字典
    """
    config_file = Path(config_path)
    
    if not config_file.exists():
        raise FileNotFoundError(
            f"配置文件不存在: {config_path}\n"
            "请复制 config.example.yaml 为 config.yaml 并填入实际值"
        )
    
    with open(config_file, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)
    
    # 验证必需字段
    required_fields = ['tencent_cloud']
    for field in required_fields:
        if field not in config:
            raise ValueError(f"配置文件缺少必需字段: {field}")
    
    tc_config = config['tencent_cloud']
    if not tc_config.get('secret_id') or tc_config['secret_id'] == 'YOUR_SECRET_ID_HERE':
        raise ValueError("请在 config.yaml 中配置正确的 secret_id")
    
    if not tc_config.get('secret_key') or tc_config['secret_key'] == 'YOUR_SECRET_KEY_HERE':
        raise ValueError("请在 config.yaml 中配置正确的 secret_key")
    
    return config


def get_credential(config_path: str = "config.yaml") -> credential.Credential:
    """
    获取腾讯云认证凭证
    
    Args:
        config_path: 配置文件路径
    
    Returns:
        Credential 对象
    """
    config = load_config(config_path)
    tc_config = config['tencent_cloud']
    
    return credential.Credential(
        tc_config['secret_id'],
        tc_config['secret_key']
    )


def get_tke_client(
    region: str = None,
    config_path: str = "config.yaml"
) -> tke_client.TkeClient:
    """
    获取 TKE 客户端
    
    Args:
        region: 地域 (留空使用配置文件默认值)
        config_path: 配置文件路径
    
    Returns:
        TkeClient 对象
    """
    config = load_config(config_path)
    cred = get_credential(config_path)
    
    if region is None:
        region = config['tencent_cloud'].get('region', 'ap-guangzhou')
    
    # HTTP 配置
    http_profile = HttpProfile()
    http_profile.endpoint = "tke.tencentcloudapi.com"
    
    # 客户端配置
    client_profile = ClientProfile()
    client_profile.httpProfile = http_profile
    
    return tke_client.TkeClient(cred, region, client_profile)


def get_cvm_client(
    region: str = None,
    config_path: str = "config.yaml"
) -> cvm_client.CvmClient:
    """
    获取 CVM 客户端
    
    Args:
        region: 地域 (留空使用配置文件默认值)
        config_path: 配置文件路径
    
    Returns:
        CvmClient 对象
    """
    config = load_config(config_path)
    cred = get_credential(config_path)
    
    if region is None:
        region = config['tencent_cloud'].get('region', 'ap-guangzhou')
    
    http_profile = HttpProfile()
    http_profile.endpoint = "cvm.tencentcloudapi.com"
    
    client_profile = ClientProfile()
    client_profile.httpProfile = http_profile
    
    return cvm_client.CvmClient(cred, region, client_profile)
