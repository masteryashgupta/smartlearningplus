#include <stdio.h>
#include <limits.h>
#include <time.h>

int main()
{
    int n, i, j, k, L;
    clock_t start, end;
    double cpu_time_used;

    printf("Enter number of matrices: ");
    scanf("%d", &n);

    int p[n + 1];
    printf("Enter dimensions (p0 p1 ... p%d) such that matrix i has dimension p[i-1] x p[i]:\n", n);
    for(i = 0; i <= n; i++)
    {
        printf("p%d: ", i);
        scanf("%d", &p[i]);
    }

    int dp[n + 1][n + 1];
    int s[n + 1][n + 1];   // to store split points for parenthesization

    // Start timing
    start = clock();

    // Cost is zero when multiplying one matrix
    for(i = 1; i <= n; i++)
        dp[i][i] = 0;

    // L is chain length
    for(L = 2; L <= n; L++)
    {
        for(i = 1; i <= n - L + 1; i++)
        {
            j = i + L - 1;
            dp[i][j] = INT_MAX;
            for(k = i; k < j; k++)
            {
                int cost = dp[i][k] + dp[k + 1][j] + p[i - 1] * p[k] * p[j];
                if(cost < dp[i][j])
                {
                    dp[i][j] = cost;
                    s[i][j] = k;
                }
            }
        }
    }

    // End timing
    end = clock();
    cpu_time_used = ((double)(end - start)) / CLOCKS_PER_SEC;

    printf("\nMinimum number of multiplications = %d\n", dp[1][n]);
    printf("\nTime Required = %f seconds\n", cpu_time_used);
    return 0;
}
