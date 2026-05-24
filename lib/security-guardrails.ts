import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export function enforceAlbWafAssociations(scope: Construct): void {
  scope.node.addValidation({
    validate: () => validateAlbWafAssociations(scope),
  });
}

export function validateAlbWafAssociations(scope: Construct): string[] {
  const constructs = scope.node.findAll();
  const wafAssociationArns = new Set(
    constructs
      .filter((node): node is wafv2.CfnWebACLAssociation => node instanceof wafv2.CfnWebACLAssociation)
      .map((association) => String(association.resourceArn)),
  );

  return constructs
    .filter((node): node is elbv2.CfnLoadBalancer => node instanceof elbv2.CfnLoadBalancer)
    .filter((loadBalancer) => isApplicationLoadBalancer(loadBalancer))
    .filter((loadBalancer) => !hasWafAssociation(loadBalancer, wafAssociationArns))
    .map(
      (loadBalancer) =>
        `Application Load Balancer "${loadBalancer.node.path}" must have an AWS::WAFv2::WebACLAssociation.`,
    );
}

function isApplicationLoadBalancer(loadBalancer: elbv2.CfnLoadBalancer): boolean {
  return loadBalancer.type === undefined || loadBalancer.type === 'application';
}

function hasWafAssociation(
  loadBalancer: elbv2.CfnLoadBalancer,
  wafAssociationArns: Set<string>,
): boolean {
  return wafAssociationArns.has(String(loadBalancer.ref));
}
