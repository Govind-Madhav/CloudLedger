resource "aws_iam_role" "cloudledger_collector" {
  name = "${var.project_name}-collector-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_policy" "cloudledger_read_only" {
  name        = "${var.project_name}-readonly-policy-${var.environment}"
  description = "Least privilege read-only inspection policy for CloudLedger cost & activity collector"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CostExplorerReadOnly"
        Effect = "Allow"
        Action = [
          "ce:GetCostAndUsage",
          "ce:GetCostAndUsageWithResources",
          "ce:GetDimensionValues",
          "ce:GetTags"
        ]
        Resource = "*"
      },
      {
        Sid    = "ResourceDiscoveryReadOnly"
        Effect = "Allow"
        Action = [
          "tag:GetResources",
          "tag:GetTagKeys",
          "tag:GetTagValues",
          "ec2:DescribeInstances",
          "ec2:DescribeVolumes",
          "ec2:DescribeVpcs",
          "ec2:DescribeNatGateways",
          "s3:ListAllMyBuckets",
          "s3:GetBucketTagging",
          "s3:GetBucketLocation",
          "rds:DescribeDBInstances",
          "rds:ListTagsForResource",
          "lambda:ListFunctions",
          "lambda:ListTags"
        ]
        Resource = "*"
      },
      {
        Sid    = "CloudTrailLookupReadOnly"
        Effect = "Allow"
        Action = [
          "cloudtrail:LookupEvents",
          "cloudtrail:DescribeTrails"
        ]
        Resource = "*"
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "cloudledger_attach" {
  role       = aws_iam_role.cloudledger_collector.name
  policy_arn = aws_iam_policy.cloudledger_read_only.arn
}
