#include <stdio.h>
#include <stdlib.h>
#include <time.h>

struct Item
{
    int weight;
    int profit;
    double ratio;
};

// Function to sort items based on profit/weight ratio (descending)
void sortItems(struct Item items[], int n)
{
    int i, j;
    struct Item temp;
    for(i = 0; i < n - 1; i++)
    {
        for(j = 0; j < n - i - 1; j++)
        {
            if(items[j].ratio < items[j + 1].ratio)
            {
                temp = items[j];
                items[j] = items[j + 1];
                items[j + 1] = temp;
            }
        }
    }
}

int main()
{
    int n, i;
    int capacity;
    clock_t start, end;
    double cpu_time_used;

    printf("Enter number of items: ");
    scanf("%d", &n);

    struct Item items[n];

    printf("Enter weight and profit of each item:\n");
    for(i = 0; i < n; i++)
    {
        printf("Item %d weight: ", i + 1);
        scanf("%d", &items[i].weight);
        printf("Item %d profit: ", i + 1);
        scanf("%d", &items[i].profit);
        items[i].ratio = (double)items[i].profit / items[i].weight;
    }

    printf("Enter knapsack capacity: ");
    scanf("%d", &capacity);

    // Start timing
    start = clock();

    // Sort items by profit/weight ratio (Greedy choice)
    sortItems(items, n);

    double totalProfit = 0.0;
    int remainingCapacity = capacity;

    printf("\nItems selected (Greedy - by profit/weight ratio):\n");
    for(i = 0; i < n && remainingCapacity > 0; i++)
    {
        if(items[i].weight <= remainingCapacity)
        {
            // Take the whole item
            remainingCapacity -= items[i].weight;
            totalProfit += items[i].profit;
            printf("Item (W=%d, P=%d) -> Fully taken\n", items[i].weight, items[i].profit);
        }
        else
        {
            // Take fraction of the item
            double fraction = (double)remainingCapacity / items[i].weight;
            totalProfit += items[i].profit * fraction;
            printf("Item (W=%d, P=%d) -> Fraction taken = %.2f\n", items[i].weight, items[i].profit, fraction);
            remainingCapacity = 0;
        }
    }

    // End timing
    end = clock();
    cpu_time_used = ((double)(end - start)) / CLOCKS_PER_SEC;

    printf("\nMaximum Profit (Greedy Knapsack) = %.2f\n", totalProfit);
    printf("\nTime Required = %f seconds\n", cpu_time_used);
    return 0;
}
