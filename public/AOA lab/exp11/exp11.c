#include <stdio.h>
#include <string.h>
#include <time.h>

int max(int a, int b)
{
    return (a > b) ? a : b;
}

int main()
{
    char X[100], Y[100];
    int m, n, i, j;
    clock_t start, end;
    double cpu_time_used;

    printf("Enter first string: ");
    scanf("%s", X);
    printf("Enter second string: ");
    scanf("%s", Y);

    m = strlen(X);
    n = strlen(Y);

    int dp[m + 1][n + 1];

    // Start timing
    start = clock();

    // Build DP table bottom-up
    for(i = 0; i <= m; i++)
    {
        for(j = 0; j <= n; j++)
        {
            if(i == 0 || j == 0)
                dp[i][j] = 0;
            else if(X[i - 1] == Y[j - 1])
                dp[i][j] = dp[i - 1][j - 1] + 1;
            else
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
        }
    }

    // Trace back to build the LCS string
    int index = dp[m][n];
    char lcs[index + 1];
    lcs[index] = '\0';
    i = m;
    j = n;
    while(i > 0 && j > 0)
    {
        if(X[i - 1] == Y[j - 1])
        {
            lcs[index - 1] = X[i - 1];
            i--;
            j--;
            index--;
        }
        else if(dp[i - 1][j] > dp[i][j - 1])
            i--;
        else
            j--;
    }

    // End timing
    end = clock();
    cpu_time_used = ((double)(end - start)) / CLOCKS_PER_SEC;

    printf("\nLength of Longest Common Subsequence = %d\n", dp[m][n]);
    printf("Longest Common Subsequence = %s\n", lcs);
    printf("\nTime Required = %f seconds\n", cpu_time_used);
    return 0;
}
