#include <stdio.h>
#include <stdlib.h>
#include <time.h>

int max(int a, int b)
{
    return (a > b) ? a : b;
}

int main()
{
    int n, capacity, i, w;
    clock_t start, end;
    double cpu_time_used;

    printf("Enter number of items: ");
    scanf("%d", &n);

    int weight[n], profit[n];

    printf("Enter weight and profit of each item:\n");
    for(i = 0; i < n; i++)
    {
        printf("Item %d weight: ", i + 1);
        scanf("%d", &weight[i]);
        printf("Item %d profit: ", i + 1);
        scanf("%d", &profit[i]);
    }

    printf("Enter knapsack capacity: ");
    scanf("%d", &capacity);

    int dp[n + 1][capacity + 1];

    // Start timing
    start = clock();

    // Build DP table bottom-up
    for(i = 0; i <= n; i++)
    {
        for(w = 0; w <= capacity; w++)
        {
            if(i == 0 || w == 0)
                dp[i][w] = 0;
            else if(weight[i - 1] <= w)
                dp[i][w] = max(profit[i - 1] + dp[i - 1][w - weight[i - 1]], dp[i - 1][w]);
            else
                dp[i][w] = dp[i - 1][w];
        }
    }

    // Trace back to find selected items
    int res = dp[n][capacity];
    w = capacity;
    printf("\nItems selected (0/1 Knapsack - DP):\n");
    for(i = n; i > 0 && res > 0; i--)
    {
        if(res != dp[i - 1][w])
        {
            printf("Item (W=%d, P=%d) -> Taken\n", weight[i - 1], profit[i - 1]);
            res -= profit[i - 1];
            w -= weight[i - 1];
        }
    }

    // End timing
    end = clock();
    cpu_time_used = ((double)(end - start)) / CLOCKS_PER_SEC;

    printf("\nMaximum Profit (0/1 Knapsack DP) = %d\n", dp[n][capacity]);
    printf("\nTime Required = %f seconds\n", cpu_time_used);
    return 0;
}
