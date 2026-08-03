using System.Net.Http.Json;
using FluentAssertions;
using PharmPOS.Core.DTOs.Pharmacy;
using Xunit;

namespace PharmPOS.IntegrationTests.Controllers;

public class SalesControllerTests : IClassFixture<IntegrationTestWebAppFactory>
{
    private readonly HttpClient _client;
    private readonly IntegrationTestWebAppFactory _factory;

    public SalesControllerTests(IntegrationTestWebAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateSale_WithoutAuthentication_ReturnsUnauthorized()
    {
        // Arrange
        var request = new CreateSaleRequest
        {
            CustomerId = Guid.NewGuid(),
            PaymentMethod = "Cash",
            PaidAmount = 10.00m,
            Items = new List<CreateSaleItemRequest>
            {
                new CreateSaleItemRequest
                {
                    DrugInventoryId = Guid.NewGuid(),
                    Quantity = 1
                }
            }
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/sales", request);

        // Assert
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);
    }
}
